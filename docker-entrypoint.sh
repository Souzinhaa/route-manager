#!/bin/bash
set -e

# Rebuild DATABASE_URL from individual components so it always points to the
# correct host/port even if a deploy manager injects a stale value.
DB_HOST="${DB_HOST:-host.docker.internal}"
DB_PORT="${DB_PORT:-5442}"
DB_NAME="${POSTGRES_DB:-${DB_NAME:-route_manager}}"
DB_USER="${POSTGRES_USER:-${DB_USER:-postgres}}"
DB_PASS="${POSTGRES_PASSWORD:-postgres}"

export DATABASE_URL="postgresql+psycopg2://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "[entrypoint] DATABASE_URL rebuilt: postgresql+psycopg2://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "[entrypoint] Waiting for database at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" > /dev/null 2>&1; do
  sleep 1
done
echo "[entrypoint] Database is ready"

exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers "${WEB_WORKERS:-1}"
