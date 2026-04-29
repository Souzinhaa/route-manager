#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Bootstrap: clone repo + install docker (if missing) + deploy stack.
#
# Auth options (optional — public repos don't need auth):
#   Option 1: Environment variables
#     export GH_USER="your_username"
#     export GH_TOKEN="your_github_token"
#     curl -fsSL https://raw.githubusercontent.com/Souzinhaa/route-manager/deploy/linux-ubuntu/install.sh | bash
#
#   Option 2: ~/.github-token file
#     echo "your_username:your_github_token" > ~/.github-token
#     chmod 600 ~/.github-token
#     curl -fsSL https://raw.githubusercontent.com/Souzinhaa/route-manager/deploy/linux-ubuntu/install.sh | bash
#
#   Option 3: Public clone (no auth needed)
#     curl -fsSL https://raw.githubusercontent.com/Souzinhaa/route-manager/deploy/linux-ubuntu/install.sh | bash
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Souzinhaa/route-manager.git}"
BRANCH="${BRANCH:-deploy/linux-ubuntu}"
TARGET_DIR="${TARGET_DIR:-route-manager}"
GH_TOKEN_FILE="${HOME}/.github-token"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[install]${NC} $*"; }
warn()  { echo -e "${YELLOW}[install]${NC} $*"; }
error() { echo -e "${RED}[install]${NC} $*" >&2; }

# ── 1. Sudo helper ──────────────────────────────────────────────────────────
SUDO=""
if [[ $EUID -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    error "Need root or sudo. Run as root or install sudo."
    exit 1
  fi
fi

# ── 2. Install Docker if missing ────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  info "Docker not found. Installing via official script..."
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO systemctl enable --now docker
  if [[ -n "${SUDO_USER:-${USER:-}}" && "${USER:-}" != "root" ]]; then
    $SUDO usermod -aG docker "${SUDO_USER:-$USER}" || true
    warn "Added ${SUDO_USER:-$USER} to docker group. Re-login required for non-sudo docker access."
  fi
else
  info "Docker present: $(docker --version)"
fi

# ── 3. Compose plugin check ─────────────────────────────────────────────────
if ! docker compose version >/dev/null 2>&1; then
  if ! command -v docker-compose >/dev/null 2>&1; then
    info "Installing docker-compose-plugin..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y docker-compose-plugin || {
      warn "Plugin install failed. Falling back to standalone docker-compose."
      $SUDO curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
      $SUDO chmod +x /usr/local/bin/docker-compose
    }
  fi
fi

# ── 4. Install git if missing ───────────────────────────────────────────────
if ! command -v git >/dev/null 2>&1; then
  info "Installing git..."
  $SUDO apt-get update -y
  $SUDO apt-get install -y git
fi

# ── 5. GitHub auth setup (read from env or ~/.github-token) ────────────────
GIT_CLONE_URL="$REPO_URL"

if [[ -n "${GH_USER:-}" && -n "${GH_TOKEN:-}" ]]; then
  info "Using auth from GH_USER + GH_TOKEN env vars..."
  GIT_CLONE_URL="https://${GH_USER}:${GH_TOKEN}@github.com/$(echo "$REPO_URL" | sed 's|.*github.com/||')"
  git config --global credential.helper store 2>/dev/null || true
elif [[ -f "$GH_TOKEN_FILE" ]]; then
  info "Using auth from $GH_TOKEN_FILE..."
  if IFS=':' read -r GH_USER GH_TOKEN < "$GH_TOKEN_FILE"; then
    GIT_CLONE_URL="https://${GH_USER}:${GH_TOKEN}@github.com/$(echo "$REPO_URL" | sed 's|.*github.com/||')"
    git config --global credential.helper store 2>/dev/null || true
  fi
else
  info "No auth configured. Using public clone."
fi

# ── 6. Clone or update repo ─────────────────────────────────────────────────
if [[ -d "$TARGET_DIR/.git" ]]; then
  info "Repo exists. Pulling latest from $BRANCH..."
  cd "$TARGET_DIR"
  git fetch origin "$BRANCH" 2>/dev/null || git fetch origin
  git checkout "$BRANCH" 2>/dev/null || true
  git pull origin "$BRANCH" 2>/dev/null || true
else
  info "Cloning repo (branch: $BRANCH)..."
  git clone -b "$BRANCH" "$GIT_CLONE_URL" "$TARGET_DIR" || git clone "$REPO_URL" "$TARGET_DIR"
  cd "$TARGET_DIR"
  git checkout "$BRANCH" 2>/dev/null || true
fi

unset GH_TOKEN GH_USER

# ── 7. Bootstrap .env ───────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  cp .env.example .env
  warn ".env created from .env.example."
  warn "EDIT SECRETS BEFORE PRODUCTION: POSTGRES_PASSWORD, SECRET_KEY, GOOGLE_MAPS_API_KEY"
  warn "  nano $(pwd)/.env"
fi

# ── 8. Run deploy ───────────────────────────────────────────────────────────
chmod +x deploy.sh
info "Starting stack..."
if groups "$USER" 2>/dev/null | grep -q docker || [[ $EUID -eq 0 ]]; then
  ./deploy.sh up
else
  $SUDO ./deploy.sh up
fi

# ── 9. Done ─────────────────────────────────────────────────────────────────
APP_PORT="$(grep -E '^APP_PORT=' .env | cut -d= -f2 || true)"
APP_PORT="${APP_PORT:-8010}"
SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo localhost)"

info "─────────────────────────────────────────────────"
info "Deploy complete."
info "App:     http://${SERVER_IP}:${APP_PORT}"
info "Health:  http://${SERVER_IP}:${APP_PORT}/health"
info "Logs:    cd $(pwd) && ./deploy.sh logs"
info "─────────────────────────────────────────────────"
