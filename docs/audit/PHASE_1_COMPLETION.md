# AMIXOF – Phase 1 Completion Report

Date: 2026-10-27 · Branch: `claude/upbeat-turing-eqc3m4` · Upstream base: Misskey **2026.10.1**,
commit `d9b1fc50ad4d57f708b9d6bc6fa7a763bb18602f`.

**PHASE 1 STATUS: COMPLETE WITH WARNINGS** – all steps were executed; the warnings are listed in
§11 and are either environment limitations of the verification sandbox or items that need a human decision.

> Important context: the Phase 1 reports referenced by the task (`docs/amixof-inventory.md`,
> `docs/audit/UPSTREAM_AUDIT.md`) and the "existing devcontainer changes" were **not present** in the
> repository or on the remote (`origin` only carries upstream `develop`). The working tree was a clean upstream
> checkout. Everything below was therefore (re)built and verified from scratch in a fresh cloud container, and
> the reports were regenerated from verified facts.

## 1. Environment verification

| Check | Result |
| --- | --- |
| Git branch | `claude/upbeat-turing-eqc3m4` (local), created from `origin/develop`; working tree clean before work started |
| Upstream commit | `d9b1fc5 fix(deps): update dependency nodemailer to v10.1.4 [security] (#18046)` = HEAD of `origin/develop` |
| Remote | `origin https://github.com/karbuunofficial/misskey` (preserved) |
| Node.js | 26.12.1 (installed via nvm; the container shipped 22.22.0, below the `^22.23.4` floor) |
| pnpm | 12.14.0 (`packageManager`) |
| Dependencies | `pnpm install --frozen-lockfile` → supply-chain policy OK, 1726 lockfile entries. **Deviation:** the sandbox egress proxy returns 403 for `codeload.github.com`, which hosts two dev-only deps (`aiscript-vscode@1dc7f60`, `storybook-addon-misskey-theme@cf583db`). They were cloned with git at exactly those commits and installed from local paths for this session; `pnpm-lock.yaml` and `packages/frontend/package.json` were restored unchanged (`git status` clean) |
| PostgreSQL | 16.15 running on 127.0.0.1:5432 (cluster `16/main`) |
| Redis | 7.0.15 running on 127.0.0.1:6379 (`maxmemory-policy noeviction`) |
| FFmpeg | present (`/usr/bin/ffmpeg`, `/usr/bin/ffprobe`) |
| Application | `pnpm build` + `pnpm migrate` + start → `Now listening on port 3000 on http://127.0.0.1:3000` |
| `/api/meta` | `version: 2026.10.1`, `name: AMIXOF`, `shortName: AMIXOF`, `uri: http://127.0.0.1:3000` (instance name set through `admin/update-meta` after creating the first admin account) |

## 2. Reproducible development environment (`.devcontainer/`)

| Requirement | Change |
| --- | --- |
| FFmpeg in the image | `Dockerfile`: `apt-get install ffmpeg postgresql-client` on top of `javascript-node:4.0.3-24-trixie` |
| Node 26.12.1 / pnpm 12.14.0 after rebuild | `devcontainer.json` features pinned (`node` 26.12.1, `pnpm` 12.14.0; were 22.23.1 / 10.10.0) |
| Do not overwrite `.config/default.yml` | `init.sh` copies the template only when the file is missing |
| Load `.config/amixof.env` automatically | `compose.yml` `env_file: ../.config/amixof.env (required: false)` + `init.sh` sources it and wires it into `~/.bashrc`/`~/.zshrc` |
| No secrets in tracked files | tracked `.config/amixof_example.env` has an empty password; `init.sh` generates a random `DATABASE_PASSWORD` into the untracked `.config/amixof.env` (`.gitignore` keeps `/.config/*` ignored, only the example is whitelisted); tracing (`set -x`) is paused around the secret handling |
| Dedicated database | `init.sh` creates role `amixof` (`LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`) and database `amixof` owned by it, idempotently; the compose `db` service and its `misskey` default database are untouched |
| Preserve DB / Redis config | `devcontainer.yml` keeps host `db`/`redis`; DB name/credentials come from `DATABASE_DB/USER/PASSWORD` (supported by `packages/backend/src/config.ts:281-283`); Redis split into db 0/1/2/3 with prefix `amixof` |

**Not verified:** a container rebuild. The sandbox has a Docker client but no daemon, so `devcontainer up`
could not run. Syntax of all files was validated (`bash -n`, JSON/YAML parse). First rebuild on a developer
machine must be observed; persistent volumes are not touched by the changes.

## 3. PostgreSQL verification

```
role  amixof: rolsuper=f rolcreatedb=f rolcreaterole=f rolinherit=f
db    amixof: owner=amixof, encoding UTF8
migrations table: 349 rows  (= 349 files in packages/backend/migration/)
pnpm --filter backend check-migrations → "All migrations are clean."
```
* AMIXOF connects as `amixof` to database `amixof` (`.config/default.yml`, untracked; password generated with
  `openssl rand -hex 24`, never printed).
* The legacy `misskey` database does not exist in this container (fresh PostgreSQL); nothing was modified.
* Credential reload after restart: the server was stopped and started three times during verification
  (initial start, rebuild for the security fixes, config recompile); each start connected successfully.

## 4. Redis verification

| Check | Result |
| --- | --- |
| Health | `redis-cli ping` → `PONG` |
| db 0 (cache + pub/sub) | 19 keys, e.g. `amixof:notificationTimeline:*`, `amixof:kvcache:*`; `PUBSUB CHANNELS` → `127.0.0.1:3000` (server channel) |
| db 1 (BullMQ) | 42 keys, e.g. `amixof:queue:system:*` |
| db 2 (timelines) | 5 keys, e.g. `amixof:list:homeTimeline:*`, `amixof:list:userTimeline:*` |
| db 3 (reactions) | 0 keys (buffer flushed; configured and connected) |
| Prefix | every key starts with `amixof:` |
| Eviction | `maxmemory-policy noeviction` (BullMQ requirement) |
| Pub/sub | WebSocket test received `mention` + `notification` events published through Redis |
| Persistence | RDB snapshots (`save 3600 1 300 100 60 10000`), AOF disabled, dir `/var/lib/redis` |

**Persistence / recovery limitations:** Redis holds the *fan-out* copies of home/user timelines (db 2), the
notification timeline cache (db 0), the reaction buffer (db 3) and queued jobs (db 1). With RDB-only
persistence, up to one snapshot interval of data is lost on a crash: queued jobs (webhooks, deliveries,
scheduled notes) can be dropped, unflushed reaction counts can be lost, and timelines/notifications fall back
to the database-backed path until repopulated (Misskey rebuilds fan-out timelines lazily). For production:
enable AOF (`appendonly yes`, `appendfsync everysec`), keep `noeviction`, and treat Redis as recoverable
cache except for db 1 (queues), which should be backed up or run on a persistent instance. Restart survival of
the configuration is a property of the deployment (devcontainer: `redis-data` named volume), not of the app.

## 5. Build and test results

| Suite | Command | Result |
| --- | --- | --- |
| Production build | `pnpm build` | PASS (backend `built/`, frontend `built/_frontend_vite_`, embed, sw) |
| TypeScript | `tsc --noEmit` (backend `src` and `test` projects) | PASS |
| Lint / format | `pnpm lint` (all packages + repository declaration files) | PASS (exit 0) |
| SPDX / locale safety | `node scripts/check-shipping.mjs` | PASS / PASS |
| Migration consistency | `pnpm --filter backend check-migrations` | PASS |
| Backend unit | `pnpm --filter backend test` | **860 passed, 1 failed, 18 skipped** (879). Failed: `test/unit/SearchService.ts > meilisearch` (needs a Meilisearch server on 127.0.0.1:57712 – not available). First run before the `test-misskey` database existed: 368/102/405 – environmental, superseded |
| Backend e2e | `pnpm --filter backend test:e2e` | **1360 passed, 6 failed, 2 skipped, 20 todo** (1388). 5 failures: `synalio/abuse-report.ts` (4) and `synalio/user-create.ts` (1) – SystemWebhook tests that POST to `http://localhost:15080`; the backend resolves hosts through `cacheable-lookup`/DNS and this sandbox's resolvers (8.8.8.8) do not resolve `localhost` → `ENOTFOUND`. Code is not at fault. 1 failure: the new "resetting a password invalidates the existing session" test raced the async cache invalidation; fixed by invalidating the native-token cache synchronously in `UserAuthService.regenerateNativeToken` and polling in the test. Re-run of `test/e2e/endpoints.ts` after the fix (and again after the API review changes): **100 passed / 0 failed** (includes 9 new security regression tests) |
| Frontend unit | `pnpm --filter frontend test` | **165 passed** (18 files) |
| misskey-js | `pnpm --filter misskey-js test` (vitest + `tsd`) | **14 passed**, type tests PASS |
| Media processing with FFmpeg | unit `test/unit/server/FileServerService.ts`, `test/unit/FileInfoService.ts`, DriveService | PASS inside the unit run (FFmpeg present). The "2 failures attributed to missing FFmpeg" in the earlier report do not reproduce here |
| Browser e2e (Playwright) | `pnpm e2e` | see §5.1 |
| Federation baseline | `pnpm --filter backend test:fed` (`test-federation/`, two Dockerised servers) | **NOT RUN** – requires Docker Compose; no daemon in the sandbox. Must be recorded on a Docker-capable machine before Phase 2 |

### 5.1 Browser e2e
`pnpm e2e` (Playwright 1.64.1, `packages/frontend/test/e2e/{basic,router}.spec.ts`) against a test server on
port 61812: **13 passed, 0 failed** (1.1 min). Note: Playwright 1.64 expects the `chromium_headless_shell-1248`
build, which is not installed in the sandbox; the run used the pre-installed Chromium (`/opt/pw-browsers/chromium`,
build 1243) through a temporary, uncommitted config override (`launchOptions.executablePath`). On a developer
machine `pnpm --filter frontend exec playwright install --with-deps chromium` (done by `init.sh`) removes the need
for that override.

Tests were not marked passed unless executed; skipped/todo counts are upstream's own.

## 6. Security findings and remediation status

Full analysis: `docs/audit/UPSTREAM_AUDIT.md`.

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | Missing CSP on SPA/API | Medium | Open – documented policy proposal; needs browser testing (Report-Only first) |
| 2 | Missing `X-Content-Type-Options: nosniff` | Medium | **Fixed** (`ServerService.ts`, global hook) – verified live on `/`, `/api/*`, `/files/*`, `/sw.js`, `/manifest.json`, `/nodeinfo/2.1`; e2e test |
| 3 | Sessions survive password change/reset | Medium | **Partially fixed**: `reset-password` and `admin/reset-password` (when resetting another user) rotate the native token (`UserAuthService.regenerateNativeToken`); a staff self-reset keeps the caller's session; `i/change-password` unchanged pending product decision; app tokens not revoked |
| 4 | Moderator can reset other moderators | High | **Fixed** (`admin/reset-password.ts`) – e2e tests |
| 5 | Secrets in moderation log | Medium | **Fixed** (`misc/redact-server-settings.ts`, `admin/update-meta.ts`) – unit tests; historic rows on real DBs need scrubbing |
| 6 | Dev mode disables protections | Low | Documented; operational requirement `NODE_ENV=production` |
| 7 | Dependency advisories (3 high / 13 moderate / 5 low) | High (runtime `ip-address` only) | Open – no upgrades performed by instruction |
| 8 | Licence review | Info | Documented in `AGPL_COMPLIANCE.md` |
| 9 | Twemoji CC-BY attribution | Medium (legal) | Open – schedule with about-page rebrand |

Must be resolved before public deployment: 1 (at least Report-Only + review), 3 (decision), 5 (scrub existing
rows if migrating an existing DB), 6 (deployment checklist), 7 (`ip-address`), 9, plus `repositoryUrl`.

## 7. AGPL and attribution review status

Documented in `docs/audit/AGPL_COMPLIANCE.md`: licence verified (AGPL-3.0-only, `misskey-js` MIT), copyright
holders inventoried (including third-party contributors Sharkey and Type4ny), §13 obligations, the existing
`repositoryUrl` / tarball mechanism, a proposal for AMIXOF's source offer, third-party attribution table, and
open questions for legal review. **Compliance is not declared complete.** No notices were removed.

## 8. Files modified / added

Environment: `.devcontainer/Dockerfile`, `.devcontainer/devcontainer.json`, `.devcontainer/compose.yml`,
`.devcontainer/devcontainer.yml`, `.devcontainer/init.sh`, `.config/amixof_example.env` (new), `.gitignore`.

Security: `packages/backend/src/server/ServerService.ts`, `packages/backend/src/core/UserAuthService.ts`,
`packages/backend/src/misc/redact-server-settings.ts` (new),
`packages/backend/src/server/api/endpoints/admin/reset-password.ts`,
`packages/backend/src/server/api/endpoints/reset-password.ts`,
`packages/backend/src/server/api/endpoints/admin/update-meta.ts`,
`packages/backend/test/unit/misc/redact-server-settings.ts` (new), `packages/backend/test/e2e/endpoints.ts`.

Documentation: `docs/amixof-inventory.md`, `docs/AMIXOF_PROGRESS.md`, `docs/audit/UPSTREAM_AUDIT.md`,
`docs/audit/AGPL_COMPLIANCE.md`, `docs/audit/PHASE_1_COMPLETION.md`, `docs/audit/PHASE_2_READINESS.md`.

Untracked local-only files (ignored, contain secrets, not committed): `.config/default.yml`, `.config/amixof.env`,
`.config/test.yml`.

## 9. Commits created

| Commit | Scope |
| --- | --- |
| `db0605c` | chore(devcontainer): make the AMIXOF dev environment reproducible |
| `f7b6f7a` | fix(backend): harden password resets, moderation log and response headers |
| (next) | docs(amixof): Phase 1 inventory, audit, AGPL notes, completion report, Phase 2 readiness |

All three are on `claude/upbeat-turing-eqc3m4` on top of upstream `d9b1fc5`.

Nothing was pushed (explicit authorization required).

## 10. Exact verification commands

```bash
# environment
git branch --show-current && git log --oneline -1 && git status --short && git remote -v
source /opt/nvm/nvm.sh && nvm install 26.12.1 && nvm use 26.12.1 && node --version && pnpm --version
pnpm install --frozen-lockfile          # see §1 for the two GitHub-hosted deps
service postgresql start && pg_isready -h 127.0.0.1
redis-server --daemonize yes --port 6379 --bind 127.0.0.1 --maxmemory-policy noeviction --dir /var/lib/redis
# database (password generated, never printed)
su postgres -c psql <<'SQL'
CREATE ROLE amixof LOGIN PASSWORD '<generated>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE DATABASE amixof OWNER amixof ENCODING 'UTF8';
SQL
pnpm build && pnpm migrate
su postgres -c "psql -d amixof -Atc 'select count(*) from migrations'"      # 349
pnpm --filter backend check-migrations
# run + smoke
pnpm start   # or: cd packages/backend && NODE_ENV=production pnpm compile-config && node ./built/entry.js
curl -s -X POST http://127.0.0.1:3000/api/meta -H 'Content-Type: application/json' -d '{}'
curl -sI http://127.0.0.1:3000/ | grep -i x-content-type-options
redis-cli -n 0 --scan | head; redis-cli -n 1 dbsize; redis-cli -n 2 dbsize; redis-cli -n 3 dbsize
redis-cli config get maxmemory-policy; redis-cli info persistence
# tests
pg_createcluster 16 amixoftest -p 54312 -- --auth-local=trust --auth-host=trust && pg_ctlcluster 16 amixoftest start
psql -h 127.0.0.1 -p 54312 -U postgres -c 'CREATE DATABASE "test-misskey"'
redis-server --daemonize yes --port 56312 --bind 127.0.0.1 --dir /var/lib/redis-test
cp .github/misskey/test.yml .config/test.yml
pnpm --filter backend test
pnpm --filter backend test:e2e
pnpm --filter frontend test
pnpm --filter misskey-js test
pnpm lint
pnpm audit
pnpm licenses list --json
node scripts/check-spdx.mjs && node scripts/check-shipping.mjs
pnpm e2e
```

## 11. Remaining risks and blockers

1. **Devcontainer rebuild unverified** (no Docker daemon in the sandbox).
2. **Meilisearch unit test** and **5 webhook e2e tests** fail only because of missing infrastructure (Meilisearch
   server; a resolver for `localhost`). Re-run in CI/devcontainer to confirm green.
3. **Federation baseline not recorded** (Docker-based two-server suite). Required before federation is changed.
4. **Open security items**: CSP, `i/change-password` policy, `ip-address` advisory, Twemoji attribution,
   scrubbing historic moderation-log rows on any pre-existing database.
5. **AGPL**: `repositoryUrl` must point at the public fork (or tarball publishing enabled) before public launch;
   legal review pending.
6. **Dependency install workaround**: in networks that block `codeload.github.com`, the two GitHub-hosted dev
   deps must be mirrored (consider vendoring or switching to npm-published versions in Phase 2).
7. The Phase 1 documents were regenerated; the earlier, uncommitted versions could not be reviewed.

## 12. Reproducible development startup

**Devcontainer (recommended):** open the repository in VS Code → "Reopen in Container". `postCreateCommand`
runs `.devcontainer/init.sh`, which installs deps, creates `.config/amixof.env` (random DB password), provisions
the `amixof` role/database, copies `.config/default.yml` only if absent, builds, migrates and installs Playwright.
Then `pnpm dev` → http://127.0.0.1:3000/.

**Bare machine:**
```bash
nvm install 26.12.1 && corepack enable && npm i -g pnpm@12.14.0
pnpm install --frozen-lockfile
cp .config/amixof_example.env .config/amixof.env   # set DATABASE_PASSWORD
cp .devcontainer/devcontainer.yml .config/default.yml  # set db.host/redis.host to your hosts
# create role/db as in §10, then:
set -a; . .config/amixof.env; set +a
pnpm build && pnpm migrate && pnpm start
```
