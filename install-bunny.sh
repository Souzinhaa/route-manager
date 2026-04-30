#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Bunny VPS Bootstrap: deploy with Nginx reverse proxy + SSL.
#
# Auth options (optional):
#   export GH_USER="user" GH_TOKEN="token"
#   curl -fsSL https://raw.githubusercontent.com/.../install-bunny.sh | bash
#
# Or:
#   echo "user:token" > ~/.github-token && chmod 600 ~/.github-token
#   curl -fsSL https://raw.githubusercontent.com/.../install-bunny.sh | bash
#
# SSL Setup (after deploy):
#   For Let's Encrypt: sudo certbot certonly --standalone -d yourdomain.com
#   Copy certs: sudo cp /etc/letsencrypt/live/yourdomain.com/{fullchain,privkey}.pem ./certs/
#   Or generate self-signed: openssl req -x509 -newkey rsa:2048 -keyout ./certs/key.pem -out ./certs/cert.pem -days 365 -nodes
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Souzinhaa/route-manager.git}"
BRANCH="${BRANCH:-deploy/bunny-vps}"
TARGET_DIR="${TARGET_DIR:-route-manager}"
GH_TOKEN_FILE="${HOME}/.github-token"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[bunny]${NC} $*"; }
warn()  { echo -e "${YELLOW}[bunny]${NC} $*"; }
error() { echo -e "${RED}[bunny]${NC} $*" >&2; }

# ── 1. Sudo helper ──────────────────────────────────────────────────────────
SUDO=""
if [[ $EUID -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    error "Need root or sudo."
    exit 1
  fi
fi

# ── 2. Install Docker ───────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO systemctl enable --now docker
  if [[ -n "${SUDO_USER:-${USER:-}}" && "${USER:-}" != "root" ]]; then
    $SUDO usermod -aG docker "${SUDO_USER:-$USER}" || true
  fi
else
  info "Docker present."
fi

# ── 3. Docker Compose ───────────────────────────────────────────────────────
if ! docker compose version >/dev/null 2>&1; then
  if ! command -v docker-compose >/dev/null 2>&1; then
    info "Installing docker-compose-plugin..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y docker-compose-plugin || {
      $SUDO curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
      $SUDO chmod +x /usr/local/bin/docker-compose
    }
  fi
fi

# ── 4. Git ──────────────────────────────────────────────────────────────────
if ! command -v git >/dev/null 2>&1; then
  $SUDO apt-get update -y && $SUDO apt-get install -y git
fi

# ── 5. Auth (env or ~/.github-token) ────────────────────────────────────────
GIT_CLONE_URL="$REPO_URL"

if [[ -n "${GH_USER:-}" && -n "${GH_TOKEN:-}" ]]; then
  info "Auth from env vars."
  GIT_CLONE_URL="https://${GH_USER}:${GH_TOKEN}@github.com/$(echo "$REPO_URL" | sed 's|.*github.com/||')"
  git config --global credential.helper store 2>/dev/null || true
elif [[ -f "$GH_TOKEN_FILE" ]]; then
  info "Auth from ~/.github-token."
  if IFS=':' read -r GH_USER GH_TOKEN < "$GH_TOKEN_FILE"; then
    GIT_CLONE_URL="https://${GH_USER}:${GH_TOKEN}@github.com/$(echo "$REPO_URL" | sed 's|.*github.com/||')"
    git config --global credential.helper store 2>/dev/null || true
  fi
fi

# ── 6. Clone ────────────────────────────────────────────────────────────────
if [[ -d "$TARGET_DIR/.git" ]]; then
  info "Pulling latest..."
  cd "$TARGET_DIR"
  git fetch origin "$BRANCH" 2>/dev/null || true
  git checkout "$BRANCH" 2>/dev/null || true
  git pull origin "$BRANCH" 2>/dev/null || true
else
  info "Cloning (branch: $BRANCH)..."
  git clone -b "$BRANCH" "$GIT_CLONE_URL" "$TARGET_DIR" || git clone "$REPO_URL" "$TARGET_DIR"
  cd "$TARGET_DIR"
  git checkout "$BRANCH" 2>/dev/null || true
fi

unset GH_TOKEN GH_USER

# ── 7. Setup certificates ───────────────────────────────────────────────────
if [[ ! -d certs ]]; then
  mkdir -p certs

  if command -v certbot >/dev/null 2>&1; then
    warn "Certbot found. Run after deploy (when DNS is live):"
    warn "  sudo certbot certonly --standalone -d yourdomain.com"
    warn "  sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem certs/cert.pem"
    warn "  sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem certs/key.pem"
    warn "  sudo chown $USER:$USER certs/*.pem"
  fi

  # Generate self-signed cert for now
  info "Generating self-signed certificate (replace with Let's Encrypt later)..."
  openssl req -x509 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem \
    -days 365 -nodes -subj "/CN=localhost" 2>/dev/null || {
    error "openssl failed. Install it: sudo apt-get install -y openssl"
    exit 1
  }
  info "Self-signed cert created: certs/cert.pem, certs/key.pem"
fi

# ── 8. .env setup ───────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  cp .env.example .env
  warn "Created .env from .env.example."
  warn "Edit: nano $(pwd)/.env"
fi

# ── 9. Deploy using bunny compose ───────────────────────────────────────────
chmod +x deploy.sh
info "Starting stack (docker-compose.bunny.yml)..."

if groups "$USER" 2>/dev/null | grep -q docker || [[ $EUID -eq 0 ]]; then
  docker compose -f docker-compose.bunny.yml up -d
else
  $SUDO docker compose -f docker-compose.bunny.yml up -d
fi

# ── 10. Done ────────────────────────────────────────────────────────────────
APP_URL="${APP_URL:-https://$(hostname -f 2>/dev/null || echo localhost)}"

info "────────────────────────────────────"
info "Deploy complete (Bunny VPS)."
info "App:  $APP_URL"
info "Logs: docker compose -f docker-compose.bunny.yml logs -f app"
info "────────────────────────────────────"
warn "SSL: Replace certs/cert.pem + certs/key.pem with Let's Encrypt certs."
warn "Then restart: docker compose -f docker-compose.bunny.yml restart nginx"
info "────────────────────────────────────"
