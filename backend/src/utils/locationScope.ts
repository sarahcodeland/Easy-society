import { VisibilityLevel, VISIBILITY_LEVEL_ORDER } from '@easysociety/shared';
import { pool } from '../db/pool';

export interface LocationAncestry {
  area_id: string | null;
  mandal_id: string | null;
  district_id: string | null;
  state_id: string | null;
}

// Walks parent_id up the hierarchy once and buckets each ancestor by type.
// Cached by callers (it's a cheap query but called on every scoped feed
// request, so wrap with utils/cache.ts at 5-10 min TTL in the route).
export async function getAncestry(locationId: string): Promise<LocationAncestry> {
  const { rows } = await pool.query<{ id: string; type: string; parent_id: string | null }>(
    `WITH RECURSIVE chain AS (
       SELECT id, type, parent_id FROM locations WHERE id = $1
       UNION ALL
       SELECT l.id, l.type, l.parent_id
       FROM locations l
       JOIN chain c ON l.id = c.parent_id
     )
     SELECT id, type, parent_id FROM chain`,
    [locationId],
  );

  const ancestry: LocationAncestry = {
    area_id: null, mandal_id: null, district_id: null, state_id: null,
  };
  for (const row of rows) {
    if (row.type === 'area') ancestry.area_id = row.id;
    if (row.type === 'mandal') ancestry.mandal_id = row.id;
    if (row.type === 'district') ancestry.district_id = row.id;
    if (row.type === 'state') ancestry.state_id = row.id;
  }
  return ancestry;
}

// Given the viewer's registered area and the visibility filter they've
// chosen, returns the set of location_ids that scope an "area" visibility
// row as visible, plus whether national content (visibility_level=national,
// location_id irrelevant) should be included.
export async function resolveVisibleScope(
  viewerAreaLocationId: string,
  filterLevel: VisibilityLevel,
): Promise<{ locationIds: string[]; includeNational: boolean; maxLevel: VisibilityLevel }> {
  const ancestry = await getAncestry(viewerAreaLocationId);
  const filterIndex = VISIBILITY_LEVEL_ORDER.indexOf(filterLevel);

  // Content is visible if: content.visibility_level's breadth <= filter's
  // breadth AND content.location_id is an ancestor (or self) of the viewer's
  // area at that same breadth.
  const candidates = [
    { level: VisibilityLevel.AREA, id: ancestry.area_id },
    { level: VisibilityLevel.MANDAL, id: ancestry.mandal_id },
    { level: VisibilityLevel.DISTRICT, id: ancestry.district_id },
    { level: VisibilityLevel.STATE, id: ancestry.state_id },
  ];

  const locationIds = candidates
    .filter((c) => VISIBILITY_LEVEL_ORDER.indexOf(c.level) <= filterIndex && c.id)
    .map((c) => c.id as string);

  return {
    locationIds,
    includeNational: filterIndex >= VISIBILITY_LEVEL_ORDER.indexOf(VisibilityLevel.NATIONAL),
    maxLevel: filterLevel,
  };
}
