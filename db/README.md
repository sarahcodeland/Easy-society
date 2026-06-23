# EasySociety Database

PostgreSQL 14+ schema for the EasySociety app.

## Migrations

- `migrations/0001_init_schema.sql` — initial schema: location hierarchy, users,
  chat, Q&A, statuses, marketplace, businesses, announcements, notifications,
  government schemes, and moderation.

Apply with:

```bash
psql "$DATABASE_URL" -f db/migrations/0001_init_schema.sql
```

## Design notes

- All primary keys are `uuid` (`gen_random_uuid()`, via `pgcrypto`).
- All timestamps are `timestamptz`, stored in UTC.
- Fixed-value columns use native Postgres `ENUM` types.
- User-generated content is never hard-deleted — tables carry an `is_deleted`
  boolean instead.
- Every table has `created_at` / `updated_at`; `updated_at` is maintained by
  the `set_updated_at()` trigger function attached to each table.
- Every foreign key declares explicit `ON DELETE` behavior:
  - Authorship columns on content (`questions.user_id`, `listings.user_id`,
    `chat_messages.sender_user_id`, etc.) use `ON DELETE SET NULL` so content
    survives account deletion.
  - Pure signal/activity rows (votes, recommendations, reactions, views,
    blocks, reports, group membership) use `ON DELETE CASCADE` since they
    have no meaning without the user.
  - `location_id` on content tables uses `ON DELETE RESTRICT` to prevent
    silently orphaning content by deleting a location node.
  - `chat_groups.location_id` uses `ON DELETE CASCADE` since a chat group
    exists solely because its location exists (one group per area).
- Polymorphic references (e.g. `qa_votes.target_id`, `notifications.reference_id`,
  `moderation_actions.target_id`) are paired with a `target_type`/`reference_type`
  enum or text discriminator and are **not** real foreign keys — Postgres can't
  constrain a column against multiple target tables, so this is enforced at the
  application layer.
- The "visitor tag" has no dedicated table. `is_visitor(user_location_id,
  content_location_id)` and `visitor_location_label(content_location_id)` are
  plain SQL functions, and `user_content_visitor_status` is a convenience view
  over them for point lookups (`WHERE user_id = ... AND content_location_id = ...`).

## Hot-path indexes

| Table | Index |
|---|---|
| `locations` | `parent_id`, `type` |
| `users` | `phone_number`, `location_id` |
| `chat_messages` | `(group_id, created_at)` |
| `questions` | `(location_id, visibility_level, created_at)` |
| `listings` | `(location_id, category, visibility_level, created_at)` |
| `statuses` | `(user_id, expires_at)` |
| `notifications` | `(user_id, is_read, created_at)` |
