#!/bin/bash
set -e

# Priority: if DATABASE_URL is already set (e.g., from Neon), use it as-is.
# Otherwise, rebuild from individual components (local dev).
if [ -z "$DATABASE_URL" ]; then
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${POSTGRES_DB:-${DB_NAME:-route_manager}}"
  DB_USER="${POSTGRES_USER:-${DB_USER:-postgres}}"
  DB_PASS="${POSTGRES_PASSWORD:-postgres}"

  export DATABASE_URL="postgresql+psycopg2://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  echo "[entrypoint] DATABASE_URL rebuilt: postgresql+psycopg2://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}"
else
  echo "[entrypoint] DATABASE_URL already set (e.g., from Neon), using as-is"
fi

# Extract host/port from DATABASE_URL for health check
DB_URL_CLEAN="${DATABASE_URL#*://}"
DB_URL_CLEAN="${DB_URL_CLEAN#*@}"  # Remove user:pass@
DB_HOST_CHECK="${DB_URL_CLEAN%:*}"
DB_PORT_CHECK="${DB_URL_CLEAN#*:}"
DB_PORT_CHECK="${DB_PORT_CHECK%/*}"

echo "[entrypoint] Waiting for database at ${DB_HOST_CHECK}:${DB_PORT_CHECK}..."
until pg_isready -h "${DB_HOST_CHECK}" -p "${DB_PORT_CHECK}" > /dev/null 2>&1; do
  sleep 1
done
echo "[entrypoint] Database is ready"

exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers "${WEB_WORKERS:-1}"
