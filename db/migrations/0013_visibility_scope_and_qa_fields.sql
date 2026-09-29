-- 1. Wider-visibility fix for questions, listings and announcements.
--    location_id stays the poster's area (used for visitor tags and area
--    names). scope_location_id is the poster's ancestor at the chosen
--    visibility_level (area -> the area itself, city -> its city, ...,
--    national -> NULL). Feeds match it against the viewer's own ancestry,
--    so a city-level post reaches every area in that city.
-- 2. Q&A fields the API already accepted but never stored.
-- 3. notifications.body: human-readable text shown in the Notifications list.

BEGIN;

-- Ancestor of a location at a given level ('area' | 'city' | 'district' | 'state').
CREATE OR REPLACE FUNCTION location_ancestor_at(loc uuid, lvl text)
RETURNS uuid LANGUAGE sql STABLE AS $$
  WITH RECURSIVE chain AS (
    SELECT id, type, parent_id FROM locations WHERE id = loc
    UNION ALL
    SELECT l.id, l.type, l.parent_id FROM locations l JOIN chain c ON l.id = c.parent_id
  )
  SELECT id FROM chain WHERE type::text = lvl LIMIT 1
$$;

ALTER TABLE questions     ADD COLUMN scope_location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE listings      ADD COLUMN scope_location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE announcements ADD COLUMN scope_location_id uuid REFERENCES locations(id) ON DELETE SET NULL;

UPDATE questions SET scope_location_id =
  CASE WHEN visibility_level = 'national' THEN NULL
       ELSE COALESCE(location_ancestor_at(location_id, visibility_level::text), location_id) END;
UPDATE listings SET scope_location_id =
  CASE WHEN visibility_level = 'national' THEN NULL
       ELSE COALESCE(location_ancestor_at(location_id, visibility_level::text), location_id) END;
UPDATE announcements SET scope_location_id =
  CASE WHEN visibility_level = 'national' THEN NULL
       ELSE COALESCE(location_ancestor_at(location_id, visibility_level::text), location_id) END;

CREATE INDEX idx_questions_scope     ON questions (scope_location_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_listings_scope      ON listings (scope_location_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_announcements_scope ON announcements (scope_location_id, created_at DESC) WHERE is_deleted = false;

ALTER TABLE questions
  ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN priority     text    NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  ADD COLUMN categories   text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN location_tag text;

ALTER TABLE notifications ADD COLUMN body text;

COMMIT;
