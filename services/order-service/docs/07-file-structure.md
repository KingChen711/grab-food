# 7. File Structure

```
src/
├── app.module.ts                    ← root NestJS module, wires everything together
├── app.controller.ts                ← health check endpoint
├── main.ts                          ← entry point, starts the HTTP server
│
├── config/
│   ├── database.config.ts           ← PostgreSQL connection config (env vars)
│   └── mongodb.config.ts            ← MongoDB URI config (env vars)
│
├── database/
│   ├── database.module.ts           ← TypeORM module for PostgreSQL
│   └── mongo.module.ts              ← Mongoose module for MongoDB
│
└── orders/
    │
    ├── domain/                      ← CORE BUSINESS LOGIC (no framework code)
    │   │
    │   ├── order.aggregate.ts       ← the order object: state machine + event sourcing
    │   ├── order.aggregate.spec.ts  ← unit tests for the aggregate
    │   │
    │   ├── events/                  ← one file per event type
    │   │   ├── base-order.event.ts       ← abstract base (orderId + occurredOn)
    │   │   ├── order-created.event.ts
    │   │   ├── order-confirmed.event.ts
    │   │   ├── order-preparing.event.ts
    │   │   ├── order-ready.event.ts
    │   │   ├── order-picked-up.event.ts
    │   │   ├── order-delivering.event.ts
    │   │   ├── order-delivered.event.ts
    │   │   ├── order-completed.event.ts
    │   │   ├── order-cancelled.event.ts
    │   │   ├── order-refunded.event.ts
    │   │   └── index.ts                  ← re-exports all events
    │   │
    │   └── value-objects/
    │       └── delivery-address.vo.ts    ← address data structure (lat/lng/address)
    │
    ├── event-store/                 ← WRITE SIDE: append-only event log (MongoDB)
    │   ├── event-store.service.ts   ← append(), load(), loadEvents()
    │   └── schemas/
    │       ├── stored-event.schema.ts   ← Mongoose schema for order_events collection
    │       └── snapshot.schema.ts       ← Mongoose schema for order_snapshots collection
    │
    ├── projections/                 ← READ SIDE: denormalized tables (PostgreSQL)
    │   ├── order-read.projection.ts ← @OnEvent handlers that update PostgreSQL
    │   └── entities/
    │       ├── order-read.entity.ts       ← TypeORM entity for orders_read table
    │       ├── order-item-read.entity.ts  ← TypeORM entity for order_items_read table
    │       └── order-timeline.entity.ts   ← TypeORM entity for order_timeline table
    │
    ├── dto/
    │   ├── create-order.dto.ts         ← input validation for POST /orders
    │   └── update-order-status.dto.ts  ← input validation for PATCH endpoints
    │
    ├── orders.service.ts            ← orchestrates aggregate + event store + events
    ├── orders.controller.ts         ← HTTP routes
    └── orders.module.ts             ← NestJS module, registers providers
```

---

## Which layer should you touch for each type of change?

| Change needed                                   | File(s) to edit                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| Add a new order status/transition               | `order.aggregate.ts` + new event class + `order-read.projection.ts` |
| Change business rule (e.g. cancellation window) | `order.aggregate.ts` only                                           |
| Add a new field to the read model               | `order-read.entity.ts` + update projection handler                  |
| Add a new API endpoint                          | `orders.controller.ts` + `orders.service.ts`                        |
| Change database connection settings             | `config/database.config.ts` or `config/mongodb.config.ts`           |
| Change snapshot frequency                       | `event-store.service.ts` → `SNAPSHOT_THRESHOLD` constant            |

---

## Domain vs Infrastructure

A key principle: the `domain/` folder has **zero** NestJS or database imports.

```typescript
// domain/order.aggregate.ts — only imports types and its own events
import type { CancellationReason, OrderItem, OrderStatus } from '@grab/types'
import { BadRequestException } from '@nestjs/common' // ← only exception from framework

import { OrderCancelledEvent } from './events/order-cancelled.event'
// ... etc
```

The domain doesn't know about MongoDB, Mongoose, TypeORM, or HTTP. This makes it:

- Easy to test: `new OrderAggregate()` in a test, no mocking needed
- Easy to understand: just TypeScript classes and plain objects
- Portable: could be extracted to a shared package if needed
