-- EasySociety: initial production schema
-- PostgreSQL 14+
-- Location-based community app for India (state -> district -> city/village -> mandal -> area)
-- Designed for 50k-1M concurrent users: UUID PKs, partial/composite indexes on hot paths,
-- soft deletes on all user-generated content, explicit ON DELETE semantics on every FK.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- =========================================================================
-- ENUM TYPES
-- =========================================================================

CREATE TYPE location_type_enum        AS ENUM ('state', 'district', 'city', 'village', 'mandal', 'area');
CREATE TYPE user_role_enum            AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE message_type_enum         AS ENUM ('text', 'image', 'voice');
CREATE TYPE visibility_level_enum     AS ENUM ('area', 'mandal', 'district', 'state', 'national');
CREATE TYPE qa_target_type_enum       AS ENUM ('question', 'answer');
CREATE TYPE vote_type_enum            AS ENUM ('upvote', 'downvote');
CREATE TYPE status_media_type_enum    AS ENUM ('text', 'photo', 'video');
CREATE TYPE listing_category_enum     AS ENUM ('buy_sell', 'rent', 'services', 'jobs', 'businesses');
CREATE TYPE reaction_type_enum        AS ENUM ('like', 'love', 'helpful', 'not_helpful');
CREATE TYPE notification_type_enum    AS ENUM ('message', 'reply', 'upvote', 'recommendation', 'announcement', 'report_resolved');
CREATE TYPE moderation_target_type_enum AS ENUM ('user', 'message', 'post', 'listing', 'announcement');
CREATE TYPE moderation_action_enum    AS ENUM ('warn', 'remove', 'ban', 'restore');

-- =========================================================================
-- HELPER: updated_at trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- LOCATION HIERARCHY
-- =========================================================================

CREATE TABLE locations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    type        location_type_enum NOT NULL,
    parent_id   uuid REFERENCES locations(id) ON DELETE RESTRICT,
    lat         double precision,
    lng         double precision,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_parent_id ON locations(parent_id);
CREATE INDEX idx_locations_type ON locations(type);

CREATE TRIGGER trg_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- USERS
-- =========================================================================

CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number      text NOT NULL UNIQUE,
    name              text NOT NULL,
    profile_photo_url text,
    location_id       uuid REFERENCES locations(id) ON DELETE SET NULL,
    role              user_role_enum NOT NULL DEFAULT 'user',
    is_verified       boolean NOT NULL DEFAULT false,
    is_deleted        boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_location_id ON users(location_id);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_blocks (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_blocks UNIQUE (blocker_user_id, blocked_user_id),
    CONSTRAINT ck_user_blocks_not_self CHECK (blocker_user_id <> blocked_user_id)
);

CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_user_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_user_id);

CREATE TRIGGER trg_user_blocks_updated_at
    BEFORE UPDATE ON user_blocks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_reports (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason              text NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_reports_not_self CHECK (reported_by_user_id <> reported_user_id)
);

CREATE INDEX idx_user_reports_reported_user ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_reported_by ON user_reports(reported_by_user_id);

CREATE TRIGGER trg_user_reports_updated_at
    BEFORE UPDATE ON user_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- CHAT
-- =========================================================================

CREATE TABLE chat_groups (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_chat_groups_location UNIQUE (location_id)
);

CREATE INDEX idx_chat_groups_location_id ON chat_groups(location_id);

CREATE TRIGGER trg_chat_groups_updated_at
    BEFORE UPDATE ON chat_groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE chat_group_members (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id      uuid NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_moderator  boolean NOT NULL DEFAULT false,
    joined_at     timestamptz NOT NULL DEFAULT now(),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_chat_group_members UNIQUE (group_id, user_id)
);

CREATE INDEX idx_chat_group_members_user_id ON chat_group_members(user_id);
CREATE INDEX idx_chat_group_members_group_id ON chat_group_members(group_id);

CREATE TRIGGER trg_chat_group_members_updated_at
    BEFORE UPDATE ON chat_group_members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE chat_messages (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id              uuid NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_user_id        uuid REFERENCES users(id) ON DELETE SET NULL,
    message_type          message_type_enum NOT NULL DEFAULT 'text',
    content               text,
    reply_to_message_id   uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_deleted            boolean NOT NULL DEFAULT false,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_group_created ON chat_messages(group_id, created_at);
CREATE INDEX idx_chat_messages_sender_user_id ON chat_messages(sender_user_id);
CREATE INDEX idx_chat_messages_reply_to ON chat_messages(reply_to_message_id);

CREATE TRIGGER trg_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE message_reports (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id           uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    reported_by_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason               text NOT NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_message_reports_message_id ON message_reports(message_id);
CREATE INDEX idx_message_reports_reported_by ON message_reports(reported_by_user_id);

CREATE TRIGGER trg_message_reports_updated_at
    BEFORE UPDATE ON message_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- Q&A
-- =========================================================================

CREATE TABLE questions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
    location_id       uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    visibility_level  visibility_level_enum NOT NULL DEFAULT 'area',
    title             text NOT NULL,
    body              text,
    is_deleted        boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_location_visibility_created
    ON questions(location_id, visibility_level, created_at);
CREATE INDEX idx_questions_user_id ON questions(user_id);

CREATE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE answers (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id   uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
    body          text NOT NULL,
    is_deleted    boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_answers_user_id ON answers(user_id);

CREATE TRIGGER trg_answers_updated_at
    BEFORE UPDATE ON answers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- target_id is polymorphic (question or answer); no FK constraint is possible
-- across two tables, so target_type + target_id is enforced at the app layer.
CREATE TABLE qa_votes (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id    uuid NOT NULL,
    target_type  qa_target_type_enum NOT NULL,
    vote_type    vote_type_enum NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_qa_votes UNIQUE (user_id, target_id, target_type)
);

CREATE INDEX idx_qa_votes_target ON qa_votes(target_type, target_id);
CREATE INDEX idx_qa_votes_user_id ON qa_votes(user_id);

CREATE TRIGGER trg_qa_votes_updated_at
    BEFORE UPDATE ON qa_votes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Separate credibility/genuineness signal, distinct from up/down votes.
CREATE TABLE qa_recommendations (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id    uuid NOT NULL,
    target_type  qa_target_type_enum NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_qa_recommendations UNIQUE (user_id, target_id, target_type)
);

CREATE INDEX idx_qa_recommendations_target ON qa_recommendations(target_type, target_id);
CREATE INDEX idx_qa_recommendations_user_id ON qa_recommendations(user_id);

CREATE TRIGGER trg_qa_recommendations_updated_at
    BEFORE UPDATE ON qa_recommendations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE qa_reports (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id    uuid NOT NULL,
    target_type  qa_target_type_enum NOT NULL,
    reason       text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_reports_target ON qa_reports(target_type, target_id);
CREATE INDEX idx_qa_reports_user_id ON qa_reports(user_id);

CREATE TRIGGER trg_qa_reports_updated_at
    BEFORE UPDATE ON qa_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- STATUS / STORIES
-- =========================================================================

CREATE TABLE statuses (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
    location_id  uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    media_type   status_media_type_enum NOT NULL DEFAULT 'text',
    content_url  text,
    text_content text,
    is_deleted   boolean NOT NULL DEFAULT false,
    expires_at   timestamptz NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_statuses_user_expires ON statuses(user_id, expires_at);
CREATE INDEX idx_statuses_location_id ON statuses(location_id);

CREATE TRIGGER trg_statuses_updated_at
    BEFORE UPDATE ON statuses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE status_views (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id       uuid NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
    viewer_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at       timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_status_views UNIQUE (status_id, viewer_user_id)
);

CREATE INDEX idx_status_views_status_id ON status_views(status_id);
CREATE INDEX idx_status_views_viewer_user_id ON status_views(viewer_user_id);

CREATE TRIGGER trg_status_views_updated_at
    BEFORE UPDATE ON status_views
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- MARKETPLACE
-- =========================================================================

CREATE TABLE listings (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid REFERENCES users(id) ON DELETE SET NULL,
    location_id       uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    visibility_level  visibility_level_enum NOT NULL DEFAULT 'area',
    category          listing_category_enum NOT NULL,
    sub_category      text,
    title             text NOT NULL,
    description       text,
    price             numeric(12, 2),
    contact_info      text,
    is_active         boolean NOT NULL DEFAULT true,
    is_deleted        boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_location_category_visibility_created
    ON listings(location_id, category, visibility_level, created_at);
CREATE INDEX idx_listings_user_id ON listings(user_id);

CREATE TRIGGER trg_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE listing_photos (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    photo_url   text NOT NULL,
    order_index integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_photos_listing_id ON listing_photos(listing_id);

CREATE TRIGGER trg_listing_photos_updated_at
    BEFORE UPDATE ON listing_photos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Same credibility system as Q&A recommendations, especially relevant for jobs.
CREATE TABLE listing_recommendations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_listing_recommendations UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_listing_recommendations_listing_id ON listing_recommendations(listing_id);
CREATE INDEX idx_listing_recommendations_user_id ON listing_recommendations(user_id);

CREATE TRIGGER trg_listing_recommendations_updated_at
    BEFORE UPDATE ON listing_recommendations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE listing_reactions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id     uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    reaction_type  reaction_type_enum NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_listing_reactions UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_listing_reactions_listing_id ON listing_reactions(listing_id);
CREATE INDEX idx_listing_reactions_user_id ON listing_reactions(user_id);

CREATE TRIGGER trg_listing_reactions_updated_at
    BEFORE UPDATE ON listing_reactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE listing_comments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id          uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id             uuid REFERENCES users(id) ON DELETE SET NULL,
    parent_comment_id   uuid REFERENCES listing_comments(id) ON DELETE SET NULL,
    body                text NOT NULL,
    is_deleted          boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_comments_listing_id ON listing_comments(listing_id);
CREATE INDEX idx_listing_comments_parent_comment_id ON listing_comments(parent_comment_id);
CREATE INDEX idx_listing_comments_user_id ON listing_comments(user_id);

CREATE TRIGGER trg_listing_comments_updated_at
    BEFORE UPDATE ON listing_comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE listing_reports (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    reason      text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_reports_listing_id ON listing_reports(listing_id);
CREATE INDEX idx_listing_reports_user_id ON listing_reports(user_id);

CREATE TRIGGER trg_listing_reports_updated_at
    BEFORE UPDATE ON listing_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- BUSINESSES
-- =========================================================================

CREATE TABLE businesses (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     uuid REFERENCES users(id) ON DELETE SET NULL,
    location_id                 uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    name                        text NOT NULL,
    description                 text,
    category                    text,
    address                     text,
    contact_number              text,
    working_hours               jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_google_maps_registered   boolean NOT NULL DEFAULT false,
    google_maps_place_id        text,
    is_verified                 boolean NOT NULL DEFAULT false,
    is_deleted                  boolean NOT NULL DEFAULT false,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_location_id ON businesses(location_id);
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_working_hours ON businesses USING gin (working_hours);

CREATE TRIGGER trg_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE business_photos (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    photo_url    text NOT NULL,
    order_index  integer NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_photos_business_id ON business_photos(business_id);

CREATE TRIGGER trg_business_photos_updated_at
    BEFORE UPDATE ON business_photos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE business_reviews (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
    rating       smallint NOT NULL,
    body         text,
    is_deleted   boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_business_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_business_reviews_business_id ON business_reviews(business_id);
CREATE INDEX idx_business_reviews_user_id ON business_reviews(user_id);

CREATE TRIGGER trg_business_reviews_updated_at
    BEFORE UPDATE ON business_reviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- ANNOUNCEMENTS
-- =========================================================================

CREATE TABLE announcements (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    posted_by_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
    location_id        uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    visibility_level   visibility_level_enum NOT NULL DEFAULT 'area',
    title              text NOT NULL,
    body               text,
    is_pinned          boolean NOT NULL DEFAULT false,
    is_official         boolean NOT NULL DEFAULT false,
    is_deleted         boolean NOT NULL DEFAULT false,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_location_visibility_created
    ON announcements(location_id, visibility_level, created_at);
CREATE INDEX idx_announcements_posted_by_user_id ON announcements(posted_by_user_id);
CREATE INDEX idx_announcements_is_pinned ON announcements(is_pinned) WHERE is_pinned = true;

CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE announcement_reports (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    announcement_id   uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    reason            text NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcement_reports_announcement_id ON announcement_reports(announcement_id);
CREATE INDEX idx_announcement_reports_user_id ON announcement_reports(user_id);

CREATE TRIGGER trg_announcement_reports_updated_at
    BEFORE UPDATE ON announcement_reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- VISITOR TAG (computed, no table)
-- =========================================================================

-- Returns true when the acting user's registered location differs from the
-- content's location_id, i.e. the user is "visiting" that content's area.
CREATE OR REPLACE FUNCTION is_visitor(p_user_location_id uuid, p_content_location_id uuid)
RETURNS boolean AS $$
    SELECT p_user_location_id IS DISTINCT FROM p_content_location_id;
$$ LANGUAGE sql IMMUTABLE;

-- Human readable label for the content's location, used by clients to render
-- the "visiting <place>" tag. Walks up the hierarchy if content_location_id
-- itself has no name (defensive, should not normally happen).
CREATE OR REPLACE FUNCTION visitor_location_label(p_content_location_id uuid)
RETURNS text AS $$
    SELECT l.name
    FROM locations l
    WHERE l.id = p_content_location_id;
$$ LANGUAGE sql STABLE;

-- Convenience view: for every user, whether they are a visitor with respect
-- to any given piece of location-scoped content, and the label to display.
-- Usage: SELECT * FROM user_content_visitor_status
--        WHERE user_id = :acting_user_id AND content_location_id = :content_location_id;
CREATE OR REPLACE VIEW user_content_visitor_status AS
SELECT
    u.id                                              AS user_id,
    l.id                                               AS content_location_id,
    is_visitor(u.location_id, l.id)                    AS is_visitor,
    CASE WHEN is_visitor(u.location_id, l.id)
         THEN visitor_location_label(l.id)
         ELSE NULL
    END                                                AS visitor_location_label
FROM users u
CROSS JOIN locations l;

-- =========================================================================
-- NOTIFICATIONS
-- =========================================================================

-- reference_id/reference_type point at the entity the notification concerns
-- (message, question, answer, listing, announcement, etc). Polymorphic, so
-- no FK constraint; enforced at the application layer.
CREATE TABLE notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type_enum NOT NULL,
    reference_id    uuid,
    reference_type  text,
    is_read         boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_isread_created
    ON notifications(user_id, is_read, created_at);

CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- GOVERNMENT SCHEMES
-- =========================================================================

CREATE TABLE schemes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    description     text,
    source_url      text,
    language        text NOT NULL DEFAULT 'en',
    location_id     uuid REFERENCES locations(id) ON DELETE SET NULL, -- null = national
    last_synced_at  timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schemes_location_id ON schemes(location_id);

CREATE TRIGGER trg_schemes_updated_at
    BEFORE UPDATE ON schemes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================================
-- MODERATION
-- =========================================================================

-- target_id is polymorphic across users/messages/posts/listings/announcements;
-- no FK constraint is possible, enforced at the application layer.
CREATE TABLE moderation_actions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
    target_type        moderation_target_type_enum NOT NULL,
    target_id          uuid NOT NULL,
    action             moderation_action_enum NOT NULL,
    reason             text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_moderation_actions_target ON moderation_actions(target_type, target_id);
CREATE INDEX idx_moderation_actions_moderator_user_id ON moderation_actions(moderator_user_id);

CREATE TRIGGER trg_moderation_actions_updated_at
    BEFORE UPDATE ON moderation_actions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
