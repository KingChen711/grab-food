# GrabFood Clone — Real-time Food Delivery Platform

A production-grade, full-stack food delivery platform built with a microservices architecture.

## Tech Stack

- **Frontend**: Next.js 15, React 19, Shadcn/ui, Tailwind CSS, Zustand, TanStack Query
- **Backend**: NestJS 11, TypeORM, Prisma, Passport.js
- **Messaging**: RabbitMQ, Apache Kafka, Redis Pub/Sub, BullMQ
- **Databases**: PostgreSQL, MongoDB, Redis, Elasticsearch, ClickHouse
- **Infrastructure**: Docker, Kubernetes, GitHub Actions, Prometheus, Grafana

## Monorepo Structure

```
grab/
├── apps/
│   ├── customer-web/          # Customer Next.js app
│   ├── restaurant-dashboard/  # Restaurant owner dashboard
│   ├── driver-app/            # Driver PWA
│   └── admin-panel/           # Admin dashboard
├── services/                  # NestJS microservices (12 services)
└── packages/
    ├── ui/                    # Shadcn/ui shared components
    ├── types/                 # Shared TypeScript types
    ├── validators/            # Shared Zod schemas
    └── config/                # ESLint, Prettier, tsconfig
```

## Quick Start

```bash
# Prerequisites: Node.js >= 22, pnpm >= 10

# Install dependencies
pnpm install

# Start infrastructure (databases, brokers)
docker compose -f infrastructure/docker/docker-compose.infra.yml up -d

# Copy env file
cp .env.example .env

# Start all apps in development
pnpm dev
```

## Shared Packages

| Package            | Description                            | Import                                                 |
| ------------------ | -------------------------------------- | ------------------------------------------------------ |
| `@grab/ui`         | Shadcn/ui components, hooks, utilities | `import { Button } from '@grab/ui'`                    |
| `@grab/types`      | TypeScript interfaces                  | `import type { Order } from '@grab/types'`             |
| `@grab/validators` | Zod schemas                            | `import { createOrderSchema } from '@grab/validators'` |
| `@grab/config`     | ESLint, Prettier, tsconfig             | `extends: '@grab/config/typescript/nextjs'`            |

## Architecture

See [scope.md](./scope.md) for the full architecture and implementation plan.
