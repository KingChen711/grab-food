# GrabFood Clone

A production-grade food delivery platform built with microservices, real-time features, and modern DevOps practices.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│   Customer Web (Next.js)   Restaurant Dashboard   Driver PWA │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                       GATEWAY LAYER                          │
│            API Gateway (NestJS) + GraphQL Federation         │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                      SERVICE MESH                            │
│  user · restaurant · order · delivery · payment              │
│  notification · search · analytics · promotion               │
│  media · recommendation                                      │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                       DATA LAYER                             │
│  PostgreSQL · MongoDB · Redis · Elasticsearch                │
│  Kafka · RabbitMQ · MinIO · ClickHouse                       │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Frontend   | Next.js 15, React 19, TypeScript, Tailwind, shadcn |
| Backend    | NestJS 11, TypeScript, GraphQL Federation          |
| Databases  | PostgreSQL 16, MongoDB 7, Redis 7, Elasticsearch 8 |
| Messaging  | Apache Kafka, RabbitMQ                             |
| Storage    | MinIO (S3-compatible)                              |
| Analytics  | ClickHouse                                         |
| Monorepo   | Turborepo + pnpm workspaces                        |
| CI/CD      | GitHub Actions                                     |
| Containers | Docker, Docker Compose                             |

## Project Structure

```
grab/
├── apps/                       # Frontend applications
│   ├── customer-web/           # Customer-facing Next.js app (port 4000)
│   ├── restaurant-dashboard/   # Restaurant management (port 4001)
│   ├── driver-app/             # Driver mobile PWA (port 4002)
│   └── admin-panel/            # Admin panel (port 4003)
├── services/                   # Backend microservices
│   ├── api-gateway/            # REST + GraphQL gateway (port 3000)
│   ├── user-service/           # Auth, profiles (port 3001)
│   ├── restaurant-service/     # Restaurants, menus (port 3002)
│   ├── order-service/          # Order lifecycle (port 3003)
│   ├── delivery-service/       # Driver tracking (port 3004)
│   ├── payment-service/        # Payments, wallets (port 3005)
│   ├── notification-service/   # Push, email, SMS (port 3006)
│   ├── search-service/         # Elasticsearch search (port 3007)
│   ├── analytics-service/      # Event analytics (port 3008)
│   ├── promotion-service/      # Vouchers, discounts (port 3009)
│   ├── media-service/          # File uploads, MinIO (port 3010)
│   └── recommendation-service/ # ML recommendations (port 3011)
├── packages/                   # Shared packages
│   ├── config/                 # ESLint, Prettier, TypeScript configs
│   ├── types/                  # Shared TypeScript interfaces
│   ├── validators/             # Shared Zod schemas
│   └── ui/                     # Shared UI components (shadcn)
└── infrastructure/
    ├── docker/                 # Docker Compose files
    └── monitoring/             # Prometheus, Grafana, ELK configs
```

## Prerequisites

- [Node.js](https://nodejs.org) >= 22.0.0
- [pnpm](https://pnpm.io) >= 10.0.0
- [Docker](https://docker.com) + Docker Compose
- [Git](https://git-scm.com)

## Quick Start

### 1. Clone and install dependencies

```bash
git clone https://github.com/your-username/grab.git
cd grab
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your local values (defaults work for local dev)
```

### 3. Start infrastructure

```bash
# Start all infrastructure (PostgreSQL, MongoDB, Redis, RabbitMQ, Kafka, etc.)
make infra

# Or directly:
docker compose -f infrastructure/docker/docker-compose.infra.yml up -d
```

### 4. Start development servers

```bash
# Start all services and apps
make dev

# Or directly:
pnpm turbo dev --concurrency=16
```

### One-command setup (first time)

```bash
make setup
```

This installs dependencies, starts infrastructure, and runs database migrations.

## Infrastructure Ports

| Service       | Port  | UI/Notes                   |
| ------------- | ----- | -------------------------- |
| PostgreSQL    | 5432  |                            |
| MongoDB       | 27017 |                            |
| Redis         | 6379  |                            |
| RabbitMQ      | 5672  | UI: http://localhost:15672 |
| Kafka         | 9092  |                            |
| Elasticsearch | 9200  |                            |
| Kibana        | 5601  | http://localhost:5601      |
| MinIO         | 9000  | UI: http://localhost:9001  |
| ClickHouse    | 8123  |                            |

## Service Ports

| Service                | HTTP | TCP  |
| ---------------------- | ---- | ---- |
| api-gateway            | 3000 | —    |
| user-service           | 3001 | 5001 |
| restaurant-service     | 3002 | 5002 |
| order-service          | 3003 | 5003 |
| delivery-service       | 3004 | 5004 |
| payment-service        | 3005 | 5005 |
| notification-service   | 3006 | 5006 |
| search-service         | 3007 | 5007 |
| analytics-service      | 3008 | 5008 |
| promotion-service      | 3009 | 5009 |
| media-service          | 3010 | 5010 |
| recommendation-service | 3011 | 5011 |

## Development Commands

```bash
# Development
make dev              # Start all services in watch mode
make infra            # Start infrastructure only
make monitoring       # Start Prometheus + Grafana + Jaeger

# Code quality
make lint             # Run ESLint
make lint-fix         # Auto-fix ESLint issues
make format           # Format code with Prettier
make typecheck        # TypeScript type check

# Testing
make test             # Run all unit tests
make test-e2e         # Run E2E tests (requires infra)

# Build
make build            # Build all packages and services
make docker-up        # Build + run all containers

# Database
make db-migrate       # Run database migrations
make db-seed          # Seed with sample data

# Cleanup
make infra-down       # Stop infrastructure
make clean            # Remove build artifacts
make infra-clean      # Remove containers + volumes (DESTRUCTIVE)
```

## Running with Docker (full stack)

```bash
# Build and start everything
docker compose -f infrastructure/docker/docker-compose.yml up -d --build

# Stop everything
docker compose -f infrastructure/docker/docker-compose.yml down
```

## Commit Convention

This project follows [Conventional Commits](https://conventionalcommits.org):

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
```

Examples:

```bash
git commit -m "feat(user-service): add JWT refresh token rotation"
git commit -m "fix(order-service): handle saga rollback on payment failure"
git commit -m "ci: add docker matrix build to CI pipeline"
```

Pre-commit hooks automatically run lint-staged (ESLint + Prettier) on staged files.

## Environment Variables

See [`.env.example`](.env.example) for all available variables with descriptions.

Key variables:

| Variable        | Description               | Default          |
| --------------- | ------------------------- | ---------------- |
| `POSTGRES_HOST` | PostgreSQL host           | `localhost`      |
| `POSTGRES_PORT` | PostgreSQL port           | `5432`           |
| `MONGO_URI`     | MongoDB connection string | `mongodb://...`  |
| `REDIS_HOST`    | Redis host                | `localhost`      |
| `KAFKA_BROKERS` | Kafka broker addresses    | `localhost:9092` |
| `RABBITMQ_URL`  | RabbitMQ connection URL   | `amqp://...`     |
| `JWT_SECRET`    | JWT signing secret        | _(required)_     |

## CI/CD

- **CI** runs on every push/PR to `main` and `develop`: lint → test → build → docker build
- **Branch protection**: `main` requires passing CI and PR review
- See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for pipeline details

## License

MIT
