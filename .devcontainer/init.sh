#!/bin/bash

set -xe

sudo chown node node_modules
sudo apt-get update
sudo apt-get -y install libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth xvfb
# FFmpeg and the PostgreSQL client are baked into the image (see Dockerfile);
# install them here as well in case the container was built from a stale image.
command -v ffmpeg >/dev/null || sudo apt-get -y install ffmpeg
command -v psql >/dev/null || sudo apt-get -y install postgresql-client
git config --global --add safe.directory /workspace
git submodule update --init
pnpm config set store-dir /home/node/.local/share/pnpm/store
pnpm install --frozen-lockfile

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AMIXOF environment
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# .config/amixof.env is untracked and holds the application database
# credentials. Create it from the example on first run with a generated password.
# (tracing is paused so the secret never appears in the postCreate log)
set +x
if [ ! -f .config/amixof.env ]; then
	cp .config/amixof_example.env .config/amixof.env
	sed -i "s/^DATABASE_PASSWORD=.*/DATABASE_PASSWORD=$(openssl rand -hex 24)/" .config/amixof.env
	chmod 600 .config/amixof.env
	echo "[amixof] created .config/amixof.env with a generated database password"
fi
set -a; . ./.config/amixof.env; set +a

# Make the environment available in every interactive shell of the container
# (compose `env_file` covers the container itself, but the very first session
# after creation started before .config/amixof.env existed).
cat > /home/node/.amixof-env.sh <<'SNIPPET'
if [ -f /workspace/.config/amixof.env ]; then
	set -a; . /workspace/.config/amixof.env; set +a
fi
SNIPPET
for rc in /home/node/.bashrc /home/node/.zshrc; do
	if [ -f "$rc" ] && ! grep -q 'amixof-env.sh' "$rc"; then
		printf '\n# AMIXOF\n. /home/node/.amixof-env.sh\n' >> "$rc"
	fi
done

# Provision the dedicated application role/database (idempotent). The postgres
# superuser of the compose `db` service is used only here; the application
# itself connects as the least-privilege role.
export PGPASSWORD="${POSTGRES_SUPERUSER_PASSWORD:-postgres}"
until pg_isready -h db -U postgres >/dev/null 2>&1; do sleep 1; done
psql -h db -U postgres -q -v ON_ERROR_STOP=1 \
	-v dbname="${DATABASE_DB}" -v dbuser="${DATABASE_USER}" -v dbpass="${DATABASE_PASSWORD}" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE', :'dbuser', :'dbpass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'dbuser') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'dbname', :'dbuser')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'dbname') \gexec
SQL
unset PGPASSWORD
echo "[amixof] database '${DATABASE_DB}' and role '${DATABASE_USER}' are provisioned"
set -x

# Never overwrite an existing configuration.
if [ ! -f .config/default.yml ]; then
	cp .devcontainer/devcontainer.yml .config/default.yml
fi

pnpm build
pnpm migrate
pnpm --filter frontend exec playwright install --with-deps chromium
