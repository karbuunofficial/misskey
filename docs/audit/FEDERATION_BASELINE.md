# AMIXOF – Federation baseline (before any Phase 2 change)

Recorded 2026-10-27 on branch `claude/upbeat-turing-eqc3m4` (upstream base `d9b1fc50ad` plus Phase 1 commits; no
federation code was modified). Suite: `packages/backend/test-federation` – two real Misskey servers (`a.test`,
`b.test`) behind nginx with a private CA, PostgreSQL 18, Redis 7, driven by Vitest in a `tester` container.

## Result

| Metric | Value |
| --- | --- |
| Test files | **9 passed (9)** – `abuse-report`, `block`, `drive`, `emoji`, `move`, `note`, `notification`, `timeline`, `user` |
| Tests | **93 passed, 13 skipped, 0 failed** (106) |
| Duration | 101 s (tests), plus image pull and dependency install |
| Database in the stack | PostgreSQL **18.6** (`postgres:18-alpine`) |
| Node.js in the stack | 26.12.1 (`NODE_VERSION`) |

The 13 skipped tests are skipped by the suite itself (`test.skip` / conditional skips upstream); they were not executed
and are not counted as passed.

## Exact procedure (Docker-capable host)

```bash
pnpm install --frozen-lockfile && pnpm build
cd packages/backend/test-federation
export NODE_VERSION=26.12.1
bash ./setup.sh                                  # generates certificates/ and .config/*.conf (git-ignored)
chmod 644 ./certificates/*.test.key
touch ../../../built/._config_.json
docker compose up -d --scale tester=0            # starts a/b servers, nginx, db, redis
docker compose run --no-deps --rm tester         # runs the 9 test files
docker compose logs | tail -n 300                # on failure
docker compose down                              # volumes node_modules* are kept for re-runs
rm -f ../../../built/._config_.json              # IMPORTANT, see below
```

**Gotcha:** the `touch built/._config_.json` step makes Misskey prefer that (empty) file over `built/.config.json`
(`packages/backend/src/config.ts:256-260`). Every normal run afterwards (`check-migrations`, unit and e2e tests, `pnpm start`) fails
with `SyntaxError: Unexpected end of JSON input` until the file is removed. This happened during Phase 1 verification.

## Sandbox-only workarounds used here (not needed on a normal Docker host)

The cloud sandbox has no pre-running Docker daemon, no IPv6, and re-terminates TLS in an egress proxy. None of the
changes touch tracked files:

1. `dockerd` was started manually (`nohup dockerd`), with default bridge networking.
2. A throwaway compose override outside the repository mounted the proxy CA bundle into the Node services and set
   `npm_config_cafile` and `SSL_CERT_FILE` so `npm install -g pnpm` / `pnpm install` inside the containers could
   verify the registry (TLS verification stayed **on**).
3. IPv6 `listen [::]` lines were removed from the generated, git-ignored `.config/a.test.conf` and `b.test.conf`
   because the sandbox kernel has no IPv6 (`nginx: socket() [::]:80 failed (97)`).

## Use in Phase 2

This is the "before" snapshot. After federation is disabled, these 9 files are expected to change: they should be
replaced by "federation is off" assertions (see `PHASE_2_READINESS.md` §5), not deleted silently. A result that
differs from 93/13/0 before any code change means the environment, not the code, changed.
