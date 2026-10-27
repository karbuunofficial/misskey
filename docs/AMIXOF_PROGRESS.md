# AMIXOF – Progress Tracker

Last updated: 2026-10-27 (Phase 1 finalization run on branch `claude/upbeat-turing-eqc3m4`).
Detailed evidence: `docs/audit/PHASE_1_COMPLETION.md`.

## Phase 1 – Baseline, environment, audit

| Step | Status | Notes |
| --- | --- | --- |
| 1. Verify environment (branch, upstream commit, Node 26.12.1, pnpm 12.14.0, deps, PostgreSQL, Redis, app start, `/api/meta`) | ✅ complete | Verified in a fresh cloud container. Two GitHub-hosted dev dependencies had to be sourced from git at the pinned commits because the sandbox proxy blocks `codeload.github.com`; the tracked lockfile is unchanged |
| 2. Reproducible devcontainer (FFmpeg, Node/pnpm pins, keep `default.yml`, auto-load `amixof.env`, no secrets in tracked files) | ⚠️ complete, untested rebuild | Files updated (`.devcontainer/*`, `.config/amixof_example.env`, `.gitignore`). The container itself could not be rebuilt here (no Docker daemon in the sandbox) – rebuild and run `init.sh` once on a developer machine |
| 3. PostgreSQL verification (`amixof` DB, least-privilege role, 349 migrations, consistency check) | ✅ complete | The legacy `misskey` database does not exist in this container; nothing to preserve here. `check-migrations`: "All migrations are clean" |
| 4. Redis verification (db 0/1/2/3 split, `amixof` prefix, pub/sub, eviction policy, persistence notes) | ✅ complete | `maxmemory-policy noeviction`; RDB snapshots only (no AOF) – see completion report for recovery limits |
| 5. Baseline testing | ⚠️ complete with environment-caused failures | Backend unit 860/1 fail (Meilisearch not available) / 18 skipped; backend e2e 1360/6 fail (5 webhook tests need a resolver for `localhost`, 1 was a race in a new test, fixed and re-run) / 2 skipped / 20 todo; frontend 165/0; misskey-js 14/0 + `tsd` OK; lint OK; typecheck OK; build OK; browser & federation e2e: see completion report |
| 6. Security findings review | ⚠️ 4 fixed with tests, 5 documented | Fixed: nosniff, moderator→moderator reset, session invalidation on reset, secret redaction in moderation log. Open: CSP, `i/change-password` session policy, dependency bumps, dev-mode protections (operational), Twemoji attribution |
| 7. AGPL compliance preparation | ✅ documented, legal review pending | `docs/audit/AGPL_COMPLIANCE.md` |
| 8. Clean-up & commits | ✅ committed locally, **not pushed** | Three logical commits (environment, docs, security). Push requires explicit authorization |
| 9. Phase 1 completion report | ✅ | `docs/audit/PHASE_1_COMPLETION.md` |
| 10. Phase 2 readiness | ✅ planning only | `docs/audit/PHASE_2_READINESS.md` |

## Carried-over work before Phase 2 starts

1. Rebuild the devcontainer once and confirm `init.sh` provisions the `amixof` role/database and loads `.config/amixof.env`.
2. Decide the `i/change-password` session-invalidation policy and the CSP rollout plan.
3. Dependency PR: `ip-address` (via `ip-cidr`) and the moderate advisories.
4. Add Twemoji CC-BY attribution together with the about-page rebranding.
5. Set `repositoryUrl` (or tarball publishing) for the AGPL source offer before any public deployment.
6. Run the browser e2e and the Docker-based federation suite on a machine with Docker to record a federation baseline.

## Phase 2 – Federation removal & rebranding

Not started. Waiting for the Phase 2 implementation instructions.
