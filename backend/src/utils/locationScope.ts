import { VisibilityLevel, VISIBILITY_LEVEL_ORDER } from '@easysociety/shared';
import { pool } from '../db/pool';

export interface LocationAncestry {
  area_id: string | null;
  city_id: string | null;
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
    area_id: null, city_id: null, district_id: null, state_id: null,
  };
  for (const row of rows) {
    if (row.type === 'area') ancestry.area_id = row.id;
    if (row.type === 'city') ancestry.city_id = row.id;
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
    { level: VisibilityLevel.CITY, id: ancestry.city_id },
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

// Every "area" has exactly one community (chat_groups.location_id is
// 1:1 with an area — see migration 0003). Unlike resolveVisibleScope
// (which walks *up* from the viewer's area to decide if a single piece of
// content is visible), this walks *down* from the filter's scope root to
// list every sibling community within it — e.g. filterLevel=city returns
// every area's community under the viewer's city, not just their own.
const MAX_AREAS_IN_SCOPE = 200;

export async function getAreaIdsInScope(
  viewerAreaLocationId: string,
  filterLevel: VisibilityLevel,
): Promise<string[]> {
  if (filterLevel === VisibilityLevel.AREA) {
    return [viewerAreaLocationId];
  }

  const ancestry = await getAncestry(viewerAreaLocationId);
  const rootId =
    filterLevel === VisibilityLevel.CITY ? ancestry.city_id :
    filterLevel === VisibilityLevel.DISTRICT ? ancestry.district_id :
    filterLevel === VisibilityLevel.STATE ? ancestry.state_id :
    null; // national — no root, every area nationwide is in scope

  if (!rootId && filterLevel !== VisibilityLevel.NATIONAL) {
    return [viewerAreaLocationId];
  }

  const { rows } = rootId
    ? await pool.query<{ id: string }>(
        `WITH RECURSIVE descendants AS (
           SELECT id, type, parent_id FROM locations WHERE id = $1
           UNION ALL
           SELECT l.id, l.type, l.parent_id
           FROM locations l JOIN descendants d ON l.parent_id = d.id
         )
         SELECT id FROM descendants WHERE type = 'area' LIMIT $2`,
        [rootId, MAX_AREAS_IN_SCOPE],
      )
    : await pool.query<{ id: string }>(
        `SELECT id FROM locations WHERE type = 'area' LIMIT $1`,
        [MAX_AREAS_IN_SCOPE],
      );

  return rows.map((r) => r.id);
}
