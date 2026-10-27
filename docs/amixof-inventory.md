# AMIXOF – Repository Inventory (Phase 1)

> Regenerated on 2026-10-27 from the verified repository state. The Phase 1
> inventory referenced by earlier planning was never committed to this
> repository (the remote only contains the upstream `develop` history), so this
> file is the authoritative replacement.

## Identity

| Item | Value |
| --- | --- |
| Product | AMIXOF (fork of Misskey) |
| Upstream | misskey-dev/misskey, release **2026.10.1** |
| Upstream base commit | `d9b1fc50ad4d57f708b9d6bc6fa7a763bb18602f` (`fix(deps): update dependency nodemailer to v10.1.4 [security] (#18046)`) |
| Fork remote | `origin` → `https://github.com/karbuunofficial/misskey` |
| Work branch | `claude/upbeat-turing-eqc3m4` (created from `develop` = upstream base) |
| License | AGPL-3.0-only (root `LICENSE`, `COPYING`); `packages/misskey-js` is MIT |

## Toolchain (verified)

| Tool | Required | Verified in this environment |
| --- | --- | --- |
| Node.js | `^22.23.4 || ^24.22.1 || ^26.12.1` (`packages/backend/package.json`), `.node-version` = 26.12.1 | 26.12.1 |
| pnpm | 12.14.0 (`packageManager`) | 12.14.0 |
| PostgreSQL | 15+ (upstream docs) | 16.15 |
| Redis | 7+ | 7.0.15 |
| FFmpeg | required for video processing / media tests | 6.x present (`/usr/bin/ffmpeg`) |

## Workspace packages

| Package | Role | Key runtime deps |
| --- | --- | --- |
| `packages/backend` | NestJS 12 + Fastify 5 API / ActivityPub / job workers | typeorm 1.1.2, pg 8.23, ioredis 5.11, bullmq 6.3, fastify 5.12 |
| `packages/frontend` | Vue 3.5 SPA built with Vite 8 | vue 3.5.44, vite 8.3.4 |
| `packages/frontend-embed` | Embeddable widgets (separate Vite build) | |
| `packages/frontend-shared` | Shared frontend utilities | |
| `packages/frontend-builder` | Build orchestration for frontend bundles | |
| `packages/sw` | Service worker | |
| `packages/misskey-js` | API client + generated types (MIT) | |
| `packages/i18n`, `packages/shared` | Locale compilation / shared types | |
| `packages/misskey-reversi`, `packages/misskey-bubble-game`, `packages/icons-subsetter` | Mini-games / icon subsetting | |

## Size of the codebase (counts)

| Area | Count |
| --- | --- |
| API endpoint files (`packages/backend/src/server/api/endpoints/**`) | 440 |
| Core services (`packages/backend/src/core/*.ts`) | 78 |
| ActivityPub files (`packages/backend/src/core/activitypub/**`) | 22 |
| Queue processors (`packages/backend/src/queue/processors/*.ts`) | 36 |
| TypeORM entities (`packages/backend/src/models/*.ts`) | 79 |
| Migrations (`packages/backend/migration/*.js`) | 349 |
| Frontend pages / components (`.vue`) | 248 / 272 |
| Locales (`locales/*.yml`) | 42 (only `ja-JP.yml` is hand-edited; the rest are Crowdin-managed) |
| `ja-JP.yml` lines mentioning "Misskey" (rebranding candidates) | 46 |

## Runtime topology

```
browser ──HTTP/WS──> Fastify (port 3000)
                       ├─ /api/*           ApiServerService (REST, JSON POST)
                       ├─ /streaming       StreamingApiServerService (WebSocket)
                       ├─ /files, /proxy   FileServerService / MediaProxy
                       ├─ /inbox, /users/* ActivityPubServerService (federation)
                       ├─ /.well-known/*   WellKnownServerService, NodeinfoServerService
                       └─ /*               ClientServerService (SPA shell, pug views)
PostgreSQL  (TypeORM; database `amixof`, least-privilege role `amixof`)
Redis       db0 cache + pub/sub · db1 BullMQ · db2 timelines · db3 reaction buffer (prefix `amixof`)
Workers     BullMQ queues: system, deliver, inbox, db, relationship, objectStorage, userWebhook, systemWebhook
```

## Configuration files

| File | Tracked | Purpose |
| --- | --- | --- |
| `.config/example.yml` | yes | Upstream reference configuration |
| `.config/default.yml` | **no** (`.gitignore`) | Live configuration (URL, DB, Redis) |
| `.config/amixof_example.env` | yes | Template for `.config/amixof.env` |
| `.config/amixof.env` | **no** | `DATABASE_DB/USER/PASSWORD`, loaded by the devcontainer |
| `.config/test.yml` | no | Copied from `.github/misskey/test.yml` for backend tests |
| `.devcontainer/*` | yes | Reproducible dev environment (see `PHASE_1_COMPLETION.md`) |
