# ─────────────────────────────────────────────────────────────────────────────
# Grab Food Platform — Makefile
# Usage: make <target>
# ─────────────────────────────────────────────────────────────────────────────

DOCKER_COMPOSE_INFRA  = docker compose -f infrastructure/docker/docker-compose.infra.yml
DOCKER_COMPOSE_FULL   = docker compose -f infrastructure/docker/docker-compose.yml
DOCKER_COMPOSE_MON    = docker compose -f infrastructure/docker/docker-compose.infra.yml \
                        -f infrastructure/docker/docker-compose.monitoring.yml

.PHONY: help setup dev infra infra-down infra-logs \
        build push clean db-migrate db-seed \
        test test-watch lint format typecheck

## ─── Help ────────────────────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

## ─── Setup ───────────────────────────────────────────────────────────────────
setup: ## One-command project setup (install deps + start infra)
	@echo "→ Installing dependencies..."
	pnpm install
	@echo "→ Starting infrastructure..."
	$(MAKE) infra
	@echo "→ Running database migrations..."
	sleep 5
	$(MAKE) db-migrate
	@echo "✓ Setup complete! Run 'make dev' to start development servers."

## ─── Development ─────────────────────────────────────────────────────────────
dev: ## Start all services in development mode (requires infra running)
	pnpm turbo dev --concurrency=16

dev-infra: infra dev ## Start infra then all services

## ─── Infrastructure ──────────────────────────────────────────────────────────
infra: ## Start infrastructure containers (DB, cache, brokers)
	$(DOCKER_COMPOSE_INFRA) up -d
	@echo "✓ Infrastructure started"
	@echo "  PostgreSQL  → localhost:5432"
	@echo "  MongoDB     → localhost:27017"
	@echo "  Redis       → localhost:6379"
	@echo "  RabbitMQ    → localhost:5672 (UI: localhost:15672)"
	@echo "  Kafka       → localhost:9092"
	@echo "  Elasticsearch → localhost:9200"
	@echo "  MinIO       → localhost:9000 (UI: localhost:9001)"
	@echo "  ClickHouse  → localhost:8123"

infra-down: ## Stop and remove infrastructure containers
	$(DOCKER_COMPOSE_INFRA) down

infra-clean: ## Stop infra and remove volumes (DESTRUCTIVE)
	$(DOCKER_COMPOSE_INFRA) down -v --remove-orphans

infra-logs: ## Follow infrastructure logs
	$(DOCKER_COMPOSE_INFRA) logs -f

infra-ps: ## Show infrastructure container status
	$(DOCKER_COMPOSE_INFRA) ps

## ─── Monitoring ──────────────────────────────────────────────────────────────
monitoring: ## Start monitoring stack (Prometheus, Grafana, Jaeger)
	$(DOCKER_COMPOSE_MON) up -d
	@echo "✓ Monitoring started"
	@echo "  Prometheus  → localhost:9090"
	@echo "  Grafana     → localhost:3500 (admin/admin)"
	@echo "  Jaeger      → localhost:16686"

monitoring-down: ## Stop monitoring stack
	$(DOCKER_COMPOSE_MON) down

## ─── Full Stack Docker ───────────────────────────────────────────────────────
docker-up: ## Build and start ALL containers (infra + services)
	$(DOCKER_COMPOSE_FULL) up -d --build

docker-down: ## Stop all containers
	$(DOCKER_COMPOSE_FULL) down

docker-build: ## Build all service Docker images
	$(DOCKER_COMPOSE_FULL) build

docker-logs: ## Follow all service logs
	$(DOCKER_COMPOSE_FULL) logs -f

## ─── Build ───────────────────────────────────────────────────────────────────
build: ## Build all packages and services
	pnpm turbo build

build-service: ## Build a specific service (SERVICE=api-gateway)
	pnpm --filter @grab/$(SERVICE) build

## ─── Database ────────────────────────────────────────────────────────────────
db-migrate: ## Run all database migrations
	pnpm turbo db:migrate

db-seed: ## Seed databases with sample data
	pnpm turbo db:seed

db-reset: ## Reset databases (migrate fresh + seed)
	$(MAKE) db-migrate
	$(MAKE) db-seed

## ─── Code Quality ────────────────────────────────────────────────────────────
test: ## Run all tests
	pnpm turbo test

test-watch: ## Run tests in watch mode
	pnpm turbo test:watch

test-e2e: ## Run E2E tests (requires infra running)
	pnpm turbo test:e2e

lint: ## Run ESLint on all packages
	pnpm turbo lint

lint-fix: ## Auto-fix ESLint issues
	pnpm turbo lint:fix

format: ## Format code with Prettier
	pnpm format

typecheck: ## TypeScript type checking
	pnpm turbo typecheck

## ─── Clean ───────────────────────────────────────────────────────────────────
clean: ## Remove build artifacts
	pnpm turbo clean

clean-all: ## Remove build artifacts and node_modules
	pnpm run clean
	find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Cleaned all artifacts and node_modules"
