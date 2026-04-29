#!/bin/bash
set -e

# Wait for database
echo "Waiting for database..."
while ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres}; do
  sleep 1
done

echo "Database is ready"

# Run app
exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WEB_WORKERS:-1}
