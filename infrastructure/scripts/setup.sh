#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup.sh — One-command project setup
# Usage: bash infrastructure/scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()    { echo -e "${BOLD}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[!]${RESET} $*"; }
error()   { echo -e "${RED}[✗]${RESET} $*"; exit 1; }

# ─── Prerequisites check ──────────────────────────────────────────────────────
info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || error "Node.js is not installed. Install Node.js >= 22"
command -v pnpm >/dev/null 2>&1 || error "pnpm is not installed. Run: npm install -g pnpm"
command -v docker >/dev/null 2>&1 || error "Docker is not installed."
command -v docker compose >/dev/null 2>&1 || error "Docker Compose v2 is not installed."

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  error "Node.js >= 22 required. Found: $(node --version)"
fi

success "Prerequisites OK (Node $(node --version), pnpm $(pnpm --version))"

# ─── Environment setup ────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  info "Creating .env from .env.example..."
  cp .env.example .env
  success "Created .env (review and update secrets before production)"
else
  warn ".env already exists, skipping"
fi

# ─── Install dependencies ─────────────────────────────────────────────────────
info "Installing dependencies..."
pnpm install --frozen-lockfile
success "Dependencies installed"

# ─── Build shared packages ────────────────────────────────────────────────────
info "Building shared packages..."
pnpm --filter @grab/types build
pnpm --filter @grab/validators build
success "Shared packages built"

# ─── Start infrastructure ─────────────────────────────────────────────────────
info "Starting infrastructure containers..."
docker compose -f infrastructure/docker/docker-compose.infra.yml up -d

info "Waiting for services to be healthy..."
MAX_RETRIES=30
RETRY_INTERVAL=5

wait_for_service() {
  local service=$1
  local retries=0
  while [ $retries -lt $MAX_RETRIES ]; do
    if docker compose -f infrastructure/docker/docker-compose.infra.yml ps "$service" | grep -q "healthy"; then
      success "$service is healthy"
      return 0
    fi
    retries=$((retries + 1))
    echo "  Waiting for $service... ($retries/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
  done
  warn "$service health check timed out (may still be starting)"
}

wait_for_service postgres
wait_for_service mongodb
wait_for_service redis
wait_for_service rabbitmq

# ─── Print service URLs ───────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}─── Infrastructure Ready ──────────────────────────────${RESET}"
echo "  PostgreSQL      → localhost:5432"
echo "  MongoDB         → localhost:27017"
echo "  Redis           → localhost:6379"
echo "  RabbitMQ AMQP   → localhost:5672"
echo "  RabbitMQ UI     → http://localhost:15672  (grab_user / grab_password)"
echo "  Kafka           → localhost:9092"
echo "  Elasticsearch   → http://localhost:9200"
echo "  MinIO API       → http://localhost:9000"
echo "  MinIO Console   → http://localhost:9001   (minioadmin / minioadmin)"
echo "  ClickHouse HTTP → http://localhost:8123"
echo ""
echo -e "${BOLD}─── Next Steps ────────────────────────────────────────${RESET}"
echo "  pnpm turbo dev         → start all services in dev mode"
echo "  pnpm turbo build       → build all services"
echo "  make db-migrate        → run database migrations"
echo ""
success "Setup complete!"
