# AMIXOF – Progress Tracker

Last updated: 2026-10-27 (UI completion on branch `amixof/phase2-standalone`).
Detailed evidence: `docs/audit/PHASE_1_COMPLETION.md`, `docs/audit/UI_COMPLETION.md`.

## Phase 1 – Baseline, environment, audit

Final verification run completed 2026-10-27 (details: `docs/audit/PHASE_1_COMPLETION.md`).

| Step | Status | Notes |
| --- | --- | --- |
| 1. Verify environment (Node 26.12.1, pnpm 12.14.0, deps, PostgreSQL, Redis, app start, `/api/meta`) | ✅ complete | Two GitHub-hosted dev dependencies were installed from git because the sandbox proxy blocks `codeload.github.com`; lockfile unchanged |
| 2. Reproducible devcontainer | ⚠️ mostly verified | Dockerfile builds (FFmpeg, psql); `init.sh` provisioning verified against PostgreSQL 18.6 and idempotent. **Not done:** a full `devcontainer up` with the ghcr.io features |
| 3. PostgreSQL (`amixof` DB, least-privilege role, 349 migrations, consistency check) | ✅ complete | Sandbox DB is 16.15; 18.6 verified in containers only |
| 4. Redis (db 0–3, prefix, eviction, pub/sub) | ✅ complete | `noeviction`; RDB only, AOF recommended for production |
| 5. Baseline testing | ✅ complete, no code-caused failures | Backend unit 864 passed / 18 skipped (+32/32 Meilisearch file with a real server); backend e2e 1370 passed / 2 skipped / 20 todo with 5 failures that pass (11/11) once `localhost` resolves; frontend 165; misskey-js 14 + tsd; browser e2e 13; federation 93 passed / 13 skipped / 0 failed; lint, typecheck, build, migrations pass |
| 6. Security findings | ⚠️ 5 fixed with tests, CSP in report-only, 4 open | Fixed: nosniff, moderator password reset, moderator MFA removal, sessions on password change/reset, moderation-log secrets; CSP report-only deployed. Open: CSP enforcement, dependency advisories, dev-mode checklist, Twemoji attribution |
| 7. AGPL preparation | ✅ documented, legal review pending | `docs/audit/AGPL_COMPLIANCE.md` |
| 8. Commits | ✅ | 6 commits; first three pushed on explicit authorization, rest local |
| 9. Completion report | ✅ | `docs/audit/PHASE_1_COMPLETION.md` |
| 10. Phase 2 readiness | ✅ planning only | `docs/audit/PHASE_2_READINESS.md` |

## Carried-over work before public launch

1. Run *Rebuild Container* once on a developer machine and confirm Node/pnpm versions, FFmpeg and a green build.
2. Enforce CSP after hashing the two inline scripts (`docs/audit/CSP_REPORT_ONLY.md`).
3. Dependency PR: `ip-address` (via `ip-cidr`) and the moderate advisories.
4. Twemoji CC-BY attribution with the about-page rebrand; `repositoryUrl` for the AGPL source offer; legal review.
5. Decide whether application tokens should be revoked or surfaced on password change.

## Phase 2 – Standalone network, branding, UI

| Step | Status | Notes |
| --- | --- | --- |
| 2A. Federation disabled (kill switch, delivery/resolve/relay guards, nodeinfo 404, admin UI hidden) | ✅ `b086030` | `docs/audit/PHASE_2A_STANDALONE.md` |
| 2B. Brand identity (logos, icons, titles, `l-amixof` / `d-amixof` themes, brand tokens) | ✅ `c941511` | `docs/audit/PHASE_2B_BRANDING.md` |
| 2C. Flush three-column shell, demo navigation order, Note button under the nav, React first | ✅ `5d7a2fb`, `d6d22c9` | `docs/audit/PHASE_2C_LAYOUT.md` |
| UI completion: top bar, 1380px shell, labelled tabs, React → Reply → Renote → Share → Favorite order, flush feed on notifications / favorites / antennas / note page | ✅ `8bbc1b8`, `010ba5d`, `567d8af`, `3fb72b5` | `docs/audit/UI_COMPLETION.md`; verified at 320–1920px in both themes; tipping intentionally absent |

Pushed: `8bbc1b8` and `010ba5d` (before the no-push instruction). Local only: `567d8af`, `3fb72b5`, docs. Nothing merged.
