-- Switch from phone-number/OTP auth to email + password auth.
-- phone_number is made nullable so existing rows are preserved without breakage;
-- new registrations will have email + password_hash instead.
ALTER TABLE users
  ALTER COLUMN phone_number DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS email         text UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash text;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
