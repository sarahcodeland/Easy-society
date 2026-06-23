-- Adds fields needed by the application layer that weren't in the original
-- spec'd column list but are required to implement language picker (signup)
-- and ban enforcement (moderation_actions records the action; this is the
-- enforced flag the auth middleware actually checks).

BEGIN;

ALTER TABLE users
    ADD COLUMN preferred_language text NOT NULL DEFAULT 'en',
    ADD COLUMN is_banned boolean NOT NULL DEFAULT false;

COMMIT;
