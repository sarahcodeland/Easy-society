# EasySociety

Location-based community app for India: state → district → city/village →
mandal → area. Group chat, Q&A, stories, marketplace, local businesses,
announcements, government schemes, and weather, all scoped to a user's
registered area by default and expandable via filter.

## Monorepo layout

```
/shared    TypeScript types + enums shared by backend and mobile (single
           source of truth for fixed-value columns — keep in sync with
           db/migrations/0001_init_schema.sql)
/backend   Node.js + Express API, Socket.io (Redis adapter) for real-time
           chat, PostgreSQL via pg, Redis via ioredis
/mobile    React Native (TypeScript) app — auth, location onboarding, chat,
           Q&A, stories, marketplace, businesses, announcements, weather,
           schemes, plus Phase 2 nav stubs
/db        SQL migrations + dev seed data
/docs      Deployment/scaling architecture notes
```

## Local development

Prerequisites: Node 18+, PostgreSQL 14+, Redis.

```bash
# 1. Build shared types
cd shared && npm install && npm run build

# 2. Backend
cd ../backend
npm install
cp .env.example .env   # edit DATABASE_URL / REDIS_URL if not using defaults
for f in ../db/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
psql "$DATABASE_URL" -f ../db/seeds/0001_sample_locations.sql   # optional sample India location tree
npm run build && npm start
# or: npm run dev  (ts-node-dev, hot reload)

# 3. Mobile
cd ../mobile
npm install
npm run android   # or: npm run ios
```

`backend/.env.example` documents every integration point (OTP provider,
S3/R2, FCM, OpenWeatherMap, Google My Business) — all are wired through
swappable provider interfaces (`backend/src/services/*`) defaulting to a mock
implementation, so the app runs fully end-to-end with zero third-party
credentials. Supply real credentials to switch a given integration on; no
call sites change.

## What's real vs. stubbed

| Area | Status |
|---|---|
| Location hierarchy, OTP login, profile/location setup | Real, DB-backed |
| Area group chat (Socket.io + Redis adapter) | Real, load-tested locally against a real Redis/Postgres pair (not at production scale — see `docs/DEPLOYMENT.md`) |
| Q&A (votes, recommendations, visibility filters) | Real |
| Status/stories (24h expiry, viewer list) | Real |
| Marketplace (listings, photos, comments, reactions, recommendations) | Real |
| Businesses + reviews | Real |
| Announcements (official vs community, 7-day gate, pinning) | Real |
| Notifications + device token registry | Real (push send is a no-op until FCM service-account creds are set) |
| Government schemes | Real read API; the myscheme.gov.in sync job is a stub (no public API exists yet — see `backend/src/services/schemes/syncJob.ts`) |
| Weather | Real (requires `OPENWEATHER_API_KEY`) |
| OTP delivery (MSG91/2Factor), Google My Business, FCM | Interface + mock/stub implementation; real provider needs live credentials |
| Voice (TTS, speech-to-text) | Real wrapper code; unverified on-device (no emulator in this environment) |
| AWS provisioning, PgBouncer, load testing at 50k–1M concurrency | Not performed — see `docs/DEPLOYMENT.md` for the designed-for architecture and rollout steps |
| Phase 2 (SOS, wallet, barter, crop doctor, village diary, mandi prices, livestock, loyalty, polls/events, verification badges, sponsored listings) | Nav stubs only, per spec — no backend or logic |

## Verification performed

- All DB migrations applied cleanly against a real PostgreSQL 14 instance.
- Backend, shared, and mobile packages each type-check with zero errors.
- Backend booted against a real local Postgres + Redis pair; smoke-tested:
  OTP request/verify → profile creation → auto-join area chat group → live
  Socket.io message send/receive (persisted to Postgres, cached in Redis,
  broadcast back) → Q&A question creation/feed/recommendation → marketplace
  listing creation → weather's configuration-error path.
