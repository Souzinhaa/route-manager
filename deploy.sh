#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# One-command deploy for Linux Ubuntu Server.
#
# Usage:
#   ./deploy.sh              # build + up (idempotent)
#   ./deploy.sh down         # stop and remove containers
#   ./deploy.sh logs         # tail app logs
#   ./deploy.sh restart      # restart app service only
#   ./deploy.sh rebuild      # full rebuild (no cache)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ── Color helpers ───────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $*"; }
error() { echo -e "${RED}[deploy]${NC} $*" >&2; }

# ── Detect compose command (v1 vs v2) ───────────────────────────────────────
if command -v docker compose >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  error "Docker Compose not found. Install Docker Engine + Compose plugin first."
  error "  curl -fsSL https://get.docker.com | sh"
  error "  sudo apt-get install -y docker-compose-plugin"
  exit 1
fi

# ── Sanity checks ───────────────────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  error "Docker daemon not running or current user lacks permission."
  error "  sudo systemctl start docker"
  error "  sudo usermod -aG docker \$USER  # then re-login"
  exit 1
fi

# ── Bootstrap .env from example ─────────────────────────────────────────────
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    warn ".env created from .env.example — edit secrets before production use."
  else
    error ".env and .env.example both missing. Aborting."
    exit 1
  fi
fi

# ── Subcommands ─────────────────────────────────────────────────────────────
CMD="${1:-up}"

case "$CMD" in
  up)
    info "Building images..."
    $COMPOSE build
    info "Starting stack..."
    $COMPOSE up -d
    info "Waiting for app health..."
    sleep 5
    $COMPOSE ps
    APP_PORT="$(grep -E '^APP_PORT=' .env | cut -d= -f2 || echo 8010)"
    APP_PORT="${APP_PORT:-8010}"
    info "App available at: http://localhost:${APP_PORT}"
    info "Health check:     http://localhost:${APP_PORT}/health"
    ;;
  down)
    info "Stopping stack..."
    $COMPOSE down
    ;;
  logs)
    $COMPOSE logs -f --tail=200 app
    ;;
  restart)
    info "Restarting app service..."
    $COMPOSE restart app
    ;;
  rebuild)
    info "Full rebuild (no cache)..."
    $COMPOSE down
    $COMPOSE build --no-cache
    $COMPOSE up -d
    ;;
  ps)
    $COMPOSE ps
    ;;
  *)
    error "Unknown command: $CMD"
    error "Usage: $0 [up|down|logs|restart|rebuild|ps]"
    exit 1
    ;;
esac
