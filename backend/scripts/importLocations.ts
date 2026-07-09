/**
 * Import India's Local Government Directory (LGD) into the locations table.
 *
 * Dataset: Local Government Directory (LGD), Ministry of Panchayati Raj
 * Source:  https://data.gov.in/catalog/local-government-directory-lgd
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx ts-node scripts/importLocations.ts
 *
 * Hierarchy inserted (mapped onto the existing location_type_enum so no
 * schema change is needed):
 *   State (state) → District (district) → Sub-District (city) → Village (area)
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { Pool, PoolClient } from 'pg';

const DATA_DIR              = path.join(__dirname, '../data');
const STATES_CSV             = path.join(DATA_DIR, 'lgd_states.csv');
const DISTRICTS_CSV          = path.join(DATA_DIR, 'lgd_districts.csv');
const SUBDISTRICTS_CSV       = path.join(DATA_DIR, 'lgd_subdistricts.csv');
const VILLAGES_CSV           = path.join(DATA_DIR, 'lgd_villages_pincodes.csv');
const BATCH                  = 2000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── CSV parsing ───────────────────────────────────────────────────────────────

async function parseCSV<T>(csvPath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const rows: T[] = [];
    fs.createReadStream(csvPath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on('data', (row: Record<string, string>) => rows.push(row as unknown as T))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

interface StateRow      { state_code: string; state_name_english: string }
interface DistrictRow   { state_code: string; district_code: string; district_name_english: string }
interface SubdistrictRow { district_code: string; subdistrict_code: string; subdistrict_name_english: string }
interface VillageRow    { subdistrictCode: string; villageNameEnglish: string }

// ── DB helpers ────────────────────────────────────────────────────────────────

async function insertBatch(
  client: PoolClient,
  rows: { name: string; type: string; parent_id: string | null }[],
): Promise<void> {
  if (rows.length === 0) return;
  const values: unknown[] = [];
  const placeholders = rows.map((r, i) => {
    values.push(r.name, r.type, r.parent_id);
    return `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`;
  });
  await client.query(
    `INSERT INTO locations (name, type, parent_id)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT DO NOTHING`,
    values,
  );
}

async function insertAll(
  client: PoolClient,
  rows: { name: string; type: string; parent_id: string | null }[],
  label: string,
): Promise<void> {
  console.log(`Inserting ${rows.length.toLocaleString()} ${label}…`);
  for (let i = 0; i < rows.length; i += BATCH) {
    await insertBatch(client, rows.slice(i, i + BATCH));
    if (rows.length > BATCH && (i / BATCH) % 25 === 0) {
      console.log(`  ${Math.min(i + BATCH, rows.length).toLocaleString()}/${rows.length.toLocaleString()}`);
    }
  }
}

async function fetchIdMap(
  client: PoolClient,
  type: string,
  parentIds?: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { rows } = await client.query(
    parentIds
      ? `SELECT id, name, parent_id FROM locations WHERE type = $1 AND parent_id = ANY($2)`
      : `SELECT id, name, parent_id FROM locations WHERE type = $1`,
    parentIds ? [type, parentIds] : [type],
  );
  for (const r of rows) {
    const key = r.parent_id ? `${r.parent_id}|${r.name}` : r.name;
    map.set(key, r.id);
  }
  return map;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  for (const p of [STATES_CSV, DISTRICTS_CSV, SUBDISTRICTS_CSV, VILLAGES_CSV]) {
    if (!fs.existsSync(p)) {
      console.error(`CSV not found at: ${p}`);
      console.error('Place the LGD states/districts/sub-districts/villages CSVs in backend/data/');
      process.exit(1);
    }
  }

  console.log('Parsing CSVs…');
  const [stateRows, districtRows, subdistrictRows, villageRows] = await Promise.all([
    parseCSV<StateRow>(STATES_CSV),
    parseCSV<DistrictRow>(DISTRICTS_CSV),
    parseCSV<SubdistrictRow>(SUBDISTRICTS_CSV),
    parseCSV<VillageRow>(VILLAGES_CSV),
  ]);
  console.log(
    `  ${stateRows.length.toLocaleString()} states, ${districtRows.length.toLocaleString()} districts, ` +
    `${subdistrictRows.length.toLocaleString()} sub-districts, ${villageRows.length.toLocaleString()} villages loaded`,
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. States ─────────────────────────────────────────────────────────────
    // Fetch existing rows first so re-runs (or a DB with pre-existing seed
    // states like "Telangana") merge by name instead of inserting duplicates —
    // the table has no unique constraint to enforce that for us.
    const stateCodeToName = new Map<string, string>();
    for (const r of stateRows) {
      if (r.state_code && r.state_name_english) stateCodeToName.set(r.state_code, r.state_name_english);
    }
    const existingStateMap = await fetchIdMap(client, 'state');
    const newStateNames = [...new Set(stateCodeToName.values())].filter((n) => !existingStateMap.has(n));
    await insertAll(client, newStateNames.sort().map((name) => ({ name, type: 'state', parent_id: null })), 'new states');
    const stateNameToId = await fetchIdMap(client, 'state');
    const stateCodeToId = new Map<string, string>();
    for (const [code, name] of stateCodeToName) {
      const id = stateNameToId.get(name);
      if (id) stateCodeToId.set(code, id);
    }
    console.log(`  ✓ ${stateNameToId.size} states`);

    // ── 2. Districts ──────────────────────────────────────────────────────────
    const districtCodeToKey = new Map<string, string>(); // district_code → "parentId|name"
    const districtSeen = new Map<string, { name: string; parent_id: string }>();
    for (const r of districtRows) {
      const parentId = stateCodeToId.get(r.state_code);
      if (!parentId || !r.district_name_english) continue;
      const key = `${parentId}|${r.district_name_english}`;
      districtSeen.set(key, { name: r.district_name_english, parent_id: parentId });
      districtCodeToKey.set(r.district_code, key);
    }
    const existingDistrictMap = await fetchIdMap(client, 'district', [...stateCodeToId.values()]);
    const newDistricts = [...districtSeen.entries()].filter(([key]) => !existingDistrictMap.has(key)).map(([, d]) => d);
    await insertAll(client, newDistricts.map((d) => ({ ...d, type: 'district' })), 'new districts');
    const districtKeyToId = await fetchIdMap(client, 'district', [...stateCodeToId.values()]);
    const districtCodeToId = new Map<string, string>();
    for (const [code, key] of districtCodeToKey) {
      const id = districtKeyToId.get(key);
      if (id) districtCodeToId.set(code, id);
    }
    console.log(`  ✓ ${districtKeyToId.size} districts`);

    // ── 3. Sub-Districts → stored as type 'city' ────────────────────────────────
    const subdistrictCodeToKey = new Map<string, string>();
    const subdistrictSeen = new Map<string, { name: string; parent_id: string }>();
    for (const r of subdistrictRows) {
      const parentId = districtCodeToId.get(r.district_code);
      if (!parentId || !r.subdistrict_name_english) continue;
      const key = `${parentId}|${r.subdistrict_name_english}`;
      subdistrictSeen.set(key, { name: r.subdistrict_name_english, parent_id: parentId });
      subdistrictCodeToKey.set(r.subdistrict_code, key);
    }
    const existingSubdistrictMap = await fetchIdMap(client, 'city', [...districtCodeToId.values()]);
    const newSubdistricts = [...subdistrictSeen.entries()].filter(([key]) => !existingSubdistrictMap.has(key)).map(([, s]) => s);
    await insertAll(client, newSubdistricts.map((s) => ({ ...s, type: 'city' })), 'new sub-districts');
    const subdistrictKeyToId = await fetchIdMap(client, 'city', [...districtCodeToId.values()]);
    const subdistrictCodeToId = new Map<string, string>();
    for (const [code, key] of subdistrictCodeToKey) {
      const id = subdistrictKeyToId.get(key);
      if (id) subdistrictCodeToId.set(code, id);
    }
    console.log(`  ✓ ${subdistrictKeyToId.size} sub-districts`);

    // ── 4. Villages → stored as type 'area' (leaf, chat-enabled) ────────────────
    const existingAreaMap = await fetchIdMap(client, 'area', [...subdistrictCodeToId.values()]);
    const villageSeen = new Set<string>();
    const villageInserts: { name: string; type: string; parent_id: string }[] = [];
    let skippedNoParent = 0;
    let skippedExisting = 0;
    for (const r of villageRows) {
      const parentId = subdistrictCodeToId.get(r.subdistrictCode);
      if (!parentId || !r.villageNameEnglish) { skippedNoParent++; continue; }
      const key = `${parentId}|${r.villageNameEnglish}`;
      if (villageSeen.has(key)) continue;
      villageSeen.add(key);
      if (existingAreaMap.has(key)) { skippedExisting++; continue; }
      villageInserts.push({ name: r.villageNameEnglish, type: 'area', parent_id: parentId });
    }
    if (skippedNoParent > 0) {
      console.log(`  (skipping ${skippedNoParent.toLocaleString()} villages whose sub-district wasn't found)`);
    }
    if (skippedExisting > 0) {
      console.log(`  (${skippedExisting.toLocaleString()} villages already present, skipped)`);
    }
    await insertAll(client, villageInserts, 'new villages');
    console.log(`  ✓ ${villageInserts.length.toLocaleString()} new villages inserted`);

    await client.query('COMMIT');
    console.log('\nImport complete.');

    const { rows: summary } = await client.query(
      `SELECT type, COUNT(*) FROM locations GROUP BY type ORDER BY type`,
    );
    console.log('\nLocations table:');
    for (const r of summary) console.log(`  ${r.type.padEnd(10)} ${Number(r.count).toLocaleString()}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nImport failed — rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
