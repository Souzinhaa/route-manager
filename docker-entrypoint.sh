#!/bin/bash
set -e

# Priority: if DATABASE_URL is already set (e.g., from Neon), use it as-is.
# Otherwise, rebuild from individual components (Docker local).
if [ -z "$DATABASE_URL" ]; then
  DB_HOST="${DB_HOST:-db}"
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
# Handle both postgresql:// and postgresql+psycopg2:// formats
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

echo "[entrypoint] starting uvicorn on 0.0.0.0:${PORT:-8000} with ${WEB_WORKERS:-1} worker(s)..."
exec python -u -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers "${WEB_WORKERS:-1}" --log-level info --access-log
