-- Verified badge label for community office-holders (sarpanch, ward member,
-- RWA president, etc). is_verified alone doesn't say *what* someone is
-- verified as, which the UI needs to render the badge text.

BEGIN;

ALTER TABLE users ADD COLUMN verified_title text;

COMMIT;
