# EasySociety — Deployment & Scaling Architecture

Target: 50,000–1,000,000 concurrent users. This doc describes the architecture
the codebase is built for. **No AWS infrastructure has been provisioned and no
load testing has been run as part of this build** — what follows is the
design the application code already assumes (env vars, the Redis Socket.io
adapter, PgBouncer-shaped connection pooling, stateless instances) and the
steps to stand it up for real.

## Topology

```
                         ┌────────────────────┐
                         │   Cloudflare CDN    │  (static assets, S3/R2 media)
                         └─────────┬───────────┘
                                   │
                         ┌─────────▼───────────┐
                         │   AWS ALB (HTTPS)   │  sticky sessions NOT required —
                         └─────────┬───────────┘  Socket.io uses the Redis adapter
                                   │
        ┌──────────────┬──────────┼──────────┬──────────────┐
        ▼              ▼          ▼          ▼              ▼
   Node instance   Node instance  ...   Node instance   Node instance
   (Express +      (Express +          (Express +      (Express +
    Socket.io)       Socket.io)          Socket.io)       Socket.io)
        │              │                    │              │
        └──────────────┴────────┬───────────┴──────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   Redis (ElastiCache)    │  Socket.io adapter pub/sub,
                    │   cluster mode           │  OTP store, rate limits,
                    └─────────────────────────┘  area-feed cache, sessions
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       PgBouncer          │  transaction pooling —
                    └─────────────┬───────────┘  absorbs connection churn from
                                  ▼              every Node instance
                    ┌─────────────────────────┐
                    │   PostgreSQL (primary    │
                    │   + read replicas)       │
                    └─────────────────────────┘
```

## Why each piece exists

- **Stateless Node instances behind an ALB.** `backend/src/server.ts` keeps no
  in-memory session/chat state — auth is a JWT, chat membership is a DB
  lookup, and rooms live in the Socket.io Redis adapter. Any instance can
  serve any request; the ALB can do plain round-robin, no sticky sessions.

- **Socket.io + `@socket.io/redis-adapter`** (`backend/src/server.ts`,
  `backend/src/sockets/chat.ts`). Without this, a message sent by a client on
  instance A never reaches a client connected to instance B. The adapter
  turns `io.to(room).emit(...)` into a Redis pub/sub broadcast every instance
  subscribes to. This is non-negotiable past one instance.

- **PgBouncer in transaction-pooling mode** in front of Postgres.
  `backend/src/db/pool.ts` already caps each Node process's pool size; point
  `DATABASE_URL` at PgBouncer (not Postgres directly) once running more than a
  couple of instances, so Postgres only ever sees PgBouncer's small, stable
  connection count instead of `N instances × pool size`.

- **Read replicas** for read-heavy endpoints (Q&A feeds, marketplace feeds,
  announcements) once a single primary becomes the bottleneck. The query
  layer (`pool.query` in each module) is a thin enough wrapper that routing
  reads to a replica pool is a config change, not a rewrite.

- **Redis for everything hot-and-shared**: OTP codes (`services/otp/otpStore.ts`),
  per-user rate limits (`middleware/rateLimit.ts`, `middleware/spamGuard.ts`),
  the banned-user flag cache (`middleware/auth.ts`), and area-feed caching
  (`utils/cache.ts`, used by the locations/weather endpoints). At 1M
  concurrent users, none of this can be process-local memory — it has to be
  visible to every instance.

- **S3/Cloudflare R2 + CDN for all media.** `services/storage/storageService.ts`
  issues presigned upload URLs; the Node API never proxies file bytes. Reads
  go through Cloudflare CDN in front of the bucket, not through Node.

- **Cloudflare CDN in front of the ALB too**, for caching public, anonymous
  GET responses (schemes list, public business directory) and for DDoS
  absorption at the edge before traffic reaches AWS at all.

## Rollout steps (not yet performed)

1. Provision RDS Postgres (Multi-AZ) + PgBouncer (own small EC2/Fargate
   service, or RDS Proxy as a managed alternative) + ElastiCache Redis
   (cluster mode enabled, so Socket.io adapter pub/sub and caching don't
   compete for the same shard unnecessarily — separate Redis instances for
   "Socket.io adapter" vs "cache/rate-limit" is the safer split at high scale).
2. Containerize the backend (`backend/Dockerfile`, not included — standard
   `node:20-slim`, multi-stage build, `npm run build && node dist/server.js`)
   and deploy via ECS Fargate or EKS with horizontal autoscaling on CPU/connection
   count.
3. Put an ALB in front, target group health-checked against `GET /health`.
4. Put Cloudflare in front of the ALB's public DNS; route `/api/storage/*`
   media reads through a separate Cloudflare-fronted R2/S3 bucket domain.
5. Run `db/migrations/*.sql` in order against the RDS primary (a simple
   migration runner — e.g. `node-pg-migrate` or a one-line `for f in
   db/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done` script gated by
   a `schema_migrations` table — is still TODO; this build applied them
   manually during validation).
6. Load test (k6/Artillery) the Socket.io chat path specifically — that's the
   component most likely to need adapter/Redis cluster tuning before it holds
   up at six-figure concurrency, since every message fans out through Redis
   pub/sub to every subscribed instance.

## Offline mode (mobile)

Not implemented in this build. The shape it should take: persist the last
fetched area feed (chat history, Q&A, marketplace, announcements) to
AsyncStorage/SQLite on the device, render that immediately on cold start, and
reconcile with the server once connectivity returns. `mobile/src/store` is
already the natural place for a `useOfflineCache` hook following the same
pattern as `authStore.ts`'s AsyncStorage persistence.
