-- Interaction system: status comments/reposts/reports,
-- Q&A answer comments, and cross-content chat shares.
-- Note: chat_rooms renamed → chat_groups to match existing schema.

BEGIN;

-- =========================================================================
-- 1. STATUS COMMENTS (threaded)
-- =========================================================================

CREATE TABLE status_comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id         uuid        NOT NULL REFERENCES statuses(id)          ON DELETE CASCADE,
  user_id           uuid                 REFERENCES users(id)             ON DELETE SET NULL,
  parent_comment_id uuid                 REFERENCES status_comments(id)   ON DELETE SET NULL,
  body              text        NOT NULL,
  is_deleted        boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_comments_status ON status_comments(status_id, created_at DESC);
CREATE INDEX idx_status_comments_parent ON status_comments(parent_comment_id);
CREATE INDEX idx_status_comments_user   ON status_comments(user_id);

CREATE TRIGGER trg_status_comments_updated_at
  BEFORE UPDATE ON status_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- 2. STATUS REPOSTS
-- =========================================================================

CREATE TABLE status_reposts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id  uuid        NOT NULL REFERENCES statuses(id)  ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  caption    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_status_reposts UNIQUE (user_id, status_id)
);

CREATE INDEX idx_status_reposts_status ON status_reposts(status_id);
CREATE INDEX idx_status_reposts_user   ON status_reposts(user_id);

-- =========================================================================
-- 3. STATUS REPORTS
-- =========================================================================

CREATE TABLE status_reports (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id   uuid        NOT NULL REFERENCES statuses(id)  ON DELETE CASCADE,
  reporter_id uuid        NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  reason      text        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_status_reports UNIQUE (reporter_id, status_id)
);

CREATE INDEX idx_status_reports_status_id ON status_reports(status_id);
CREATE INDEX idx_status_reports_reporter  ON status_reports(reporter_id);
CREATE INDEX idx_status_reports_pending   ON status_reports(status) WHERE status = 'pending';

-- =========================================================================
-- 4. Q&A ANSWER COMMENTS (threaded)
-- =========================================================================

CREATE TABLE qa_comments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id         uuid        NOT NULL REFERENCES answers(id)      ON DELETE CASCADE,
  user_id           uuid                 REFERENCES users(id)        ON DELETE SET NULL,
  parent_comment_id uuid                 REFERENCES qa_comments(id)  ON DELETE SET NULL,
  body              text        NOT NULL,
  is_deleted        boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_comments_answer ON qa_comments(answer_id, created_at DESC);
CREATE INDEX idx_qa_comments_parent ON qa_comments(parent_comment_id);
CREATE INDEX idx_qa_comments_user   ON qa_comments(user_id);

CREATE TRIGGER trg_qa_comments_updated_at
  BEFORE UPDATE ON qa_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- 5. CHAT SHARES — share any content type into a chat group
-- =========================================================================
-- Note: references chat_groups (not chat_rooms — that table does not exist).
-- target_type is app-layer enforced; no FK possible across multiple tables.

CREATE TABLE chat_shares (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid        NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  group_id    uuid        NOT NULL REFERENCES chat_groups(id)  ON DELETE CASCADE,
  target_type varchar(20) NOT NULL
              CHECK (target_type IN ('status', 'listing', 'question', 'answer')),
  target_id   uuid        NOT NULL,
  message     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_shares_group  ON chat_shares(group_id, created_at DESC);
CREATE INDEX idx_chat_shares_sender ON chat_shares(sender_id);
CREATE INDEX idx_chat_shares_target ON chat_shares(target_type, target_id);

COMMIT;
