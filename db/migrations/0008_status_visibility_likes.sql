-- Status visibility + like counts
ALTER TABLE statuses
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'all_neighbors'
    CHECK (visibility IN ('all_neighbors', 'close_only'));

CREATE TABLE IF NOT EXISTS status_likes (
  status_id     uuid NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (status_id, user_id)
);
