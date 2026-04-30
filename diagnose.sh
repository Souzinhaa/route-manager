#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Diagnostic dump for unhealthy containers when normal logs are inaccessible.
#
# Usage: ./diagnose.sh [-f compose-file]
# ─────────────────────────────────────────────────────────────────────────────

set +e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

COMPOSE_FILE="docker-compose.yml"
if [[ "${1:-}" == "-f" && -n "${2:-}" ]]; then
  COMPOSE_FILE="$2"
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose -f $COMPOSE_FILE"
else
  COMPOSE="docker-compose -f $COMPOSE_FILE"
fi

echo "════════════════════════════════════════════════════════════════"
echo "DIAGNOSTIC DUMP — $(date)"
echo "Compose file: $COMPOSE_FILE"
echo "════════════════════════════════════════════════════════════════"

echo ""
echo "── 1. Compose service status ─────────────────────────────────"
$COMPOSE ps -a

echo ""
echo "── 2. Raw docker ps (all containers) ─────────────────────────"
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "── 3. Service logs (last 200 lines each) ─────────────────────"
for svc in db app nginx; do
  echo ""
  echo "─── Service: $svc ───"
  $COMPOSE logs --tail=200 --no-color "$svc" 2>&1 || true
done

echo ""
echo "── 4. App container deep inspect ──────────────────────────────"
APP_CID="$(docker ps -aqf "name=app" | head -1)"
if [[ -n "$APP_CID" ]]; then
  echo "Container ID: $APP_CID"
  echo ""
  echo "── Health status:"
  docker inspect --format '{{json .State.Health}}' "$APP_CID" 2>&1
  echo ""
  echo "── Exit code:"
  docker inspect --format '{{.State.ExitCode}}' "$APP_CID" 2>&1
  echo ""
  echo "── Restart count:"
  docker inspect --format '{{.RestartCount}}' "$APP_CID" 2>&1
  echo ""
  echo "── Raw docker logs (last 300):"
  docker logs --tail=300 "$APP_CID" 2>&1
else
  echo "(no app container found)"
fi

echo ""
echo "── 5. Network connectivity from app container ────────────────"
$COMPOSE exec -T app sh -c "curl -fsS http://localhost:8000/health" 2>&1 || echo "(app /health not responding)"
$COMPOSE exec -T app sh -c "getent hosts db" 2>&1 || echo "(can't resolve db hostname)"
$COMPOSE exec -T app sh -c "ls /app/static/ 2>&1 | head -5" 2>&1 || echo "(no static dir)"

echo ""
echo "── 6. DB container status ─────────────────────────────────────"
DB_CID="$(docker ps -aqf "name=db" | head -1)"
if [[ -n "$DB_CID" ]]; then
  docker exec "$DB_CID" pg_isready -U postgres 2>&1 || echo "(pg_isready failed)"
fi

echo ""
echo "── 7. Resource usage ─────────────────────────────────────────"
docker stats --no-stream

echo ""
echo "── 8. Disk space ─────────────────────────────────────────────"
df -h | head -10

echo ""
echo "── 9. .env vars (sanitized) ──────────────────────────────────"
if [[ -f .env ]]; then
  grep -v -E '^(POSTGRES_PASSWORD|SECRET_KEY|GOOGLE_MAPS_API_KEY|GH_TOKEN)=' .env || true
else
  echo "(.env missing)"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "End of diagnostic dump."
echo "════════════════════════════════════════════════════════════════"
