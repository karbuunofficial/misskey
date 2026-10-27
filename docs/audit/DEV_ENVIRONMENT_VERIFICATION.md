# AMIXOF – Development environment verification

Recorded 2026-10-27. "Verified" means executed in this session; everything else is listed under *Not verified*.

## Toolchain and services (cloud sandbox)

| Check | Result |
| --- | --- |
| Node.js | **26.12.1** (nvm); the sandbox's default `node` is 22.22.0, below the `^22.23.4` engine floor, so always `nvm use 26.12.1` |
| pnpm | **12.14.0** |
| FFmpeg | present (6.1.1 in the sandbox, 7.1.5 in the rebuilt devcontainer image) |
| Application database | `amixof`, owner role `amixof` (`NOSUPERUSER NOCREATEDB NOCREATEROLE`), 349 migrations |
| Redis | db 0: 15 keys, db 1: 54, db 2: 9, db 3: 0; **0 keys without the `amixof:` prefix**; `maxmemory-policy noeviction` |

## PostgreSQL 18.6

The sandbox's native PostgreSQL is **16.15**, so the instruction "verify PostgreSQL 18.6" was checked against the
version the project actually targets, `postgres:18-alpine` from `.devcontainer/compose.yml`, in containers:
`show server_version` → **18.6**. The same image runs in the federation stack. The `amixof` database itself in this
sandbox runs on 16.15; running the complete test matrix against 18.6 requires the devcontainer's own `db` service.

## Devcontainer pieces exercised with Docker

| Piece | Result |
| --- | --- |
| `docker build .devcontainer` (modified `Dockerfile`) | builds; image contains FFmpeg 7.1.5 and `psql` 17.11 |
| `.devcontainer/init.sh` provisioning section against a throwaway `postgres:18-alpine` (own network, `--rm`, no volumes) | creates `.config/amixof.env` (mode 600, generated 48-hex password, never printed), creates role `amixof` (`rolsuper=f, rolcreatedb=f, rolcreaterole=f`) and database `amixof` owned by it; **second run is a no-op** (idempotent); the pre-existing `misskey` database (owner `postgres`) is untouched |
| `compose.yml` / `devcontainer.json` / `devcontainer.yml` | parse as valid YAML/JSON; `docker compose config` validates the federation stack |

## Not verified (blockers for "fully reproducible")

* A full `devcontainer up` (the VS Code/CLI flow with the `node` and `pnpm` **features** and `postCreateCommand`).
  The features come from `ghcr.io`, which was not exercised; consequently the in-container Node 26.12.1 / pnpm 12.14.0
  pinning (the base image ships Node 24.10.0) is configured but unobserved. `devcontainer.json` → please run
  *Rebuild Container* once and confirm `node --version`, `pnpm --version`, `ffmpeg -version`, `psql` and a green
  `pnpm build && pnpm migrate`.
* Persistent-volume safety of a rebuild: not attempted in the sandbox; nothing in the changes touches the
  `postgres-data`, `redis-data` or `node_modules` volumes, and the old `misskey` database is never altered.
* Credential reload after container restart: verified for the sandbox app (three restarts); for the devcontainer the
  mechanism is `env_file` + `~/.amixof-env.sh`, unobserved.
