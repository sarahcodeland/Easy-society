-- "Mandal" was leftover terminology from an old hand-written sample seed
-- (db/seeds/0001_sample_locations.sql) with no corresponding real data —
-- the actual location hierarchy collected from users at signup is only
-- state -> district -> city -> area. This migration:
--   1. Drops the unused 'village' / 'mandal' values from location_type_enum
--      (no row has ever used them outside that stale seed).
--   2. Replaces visibility_level_enum's 'mandal' step with 'city' — the
--      real intermediate level between area and district.
-- Postgres has no ALTER TYPE ... DROP VALUE, so both enums are recreated.

BEGIN;

-- ── location_type_enum: drop 'village' and 'mandal' ─────────────────────────
ALTER TYPE location_type_enum RENAME TO location_type_enum_old;
CREATE TYPE location_type_enum AS ENUM ('state', 'district', 'city', 'area');
ALTER TABLE locations ALTER COLUMN type TYPE location_type_enum USING type::text::location_type_enum;
DROP TYPE location_type_enum_old;

-- ── visibility_level_enum: 'mandal' -> 'city' ───────────────────────────────
ALTER TYPE visibility_level_enum RENAME TO visibility_level_enum_old;
CREATE TYPE visibility_level_enum AS ENUM ('area', 'city', 'district', 'state', 'national');

ALTER TABLE questions ALTER COLUMN visibility_level DROP DEFAULT;
ALTER TABLE questions ALTER COLUMN visibility_level TYPE visibility_level_enum
  USING (CASE WHEN visibility_level::text = 'mandal' THEN 'city' ELSE visibility_level::text END)::visibility_level_enum;
ALTER TABLE questions ALTER COLUMN visibility_level SET DEFAULT 'area';

ALTER TABLE listings ALTER COLUMN visibility_level DROP DEFAULT;
ALTER TABLE listings ALTER COLUMN visibility_level TYPE visibility_level_enum
  USING (CASE WHEN visibility_level::text = 'mandal' THEN 'city' ELSE visibility_level::text END)::visibility_level_enum;
ALTER TABLE listings ALTER COLUMN visibility_level SET DEFAULT 'area';

ALTER TABLE announcements ALTER COLUMN visibility_level DROP DEFAULT;
ALTER TABLE announcements ALTER COLUMN visibility_level TYPE visibility_level_enum
  USING (CASE WHEN visibility_level::text = 'mandal' THEN 'city' ELSE visibility_level::text END)::visibility_level_enum;
ALTER TABLE announcements ALTER COLUMN visibility_level SET DEFAULT 'area';

DROP TYPE visibility_level_enum_old;

COMMIT;
