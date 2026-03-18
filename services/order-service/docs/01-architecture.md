# 1. Overview & Architecture

## What patterns are used here?

This service uses two advanced patterns together: **Event Sourcing** and **CQRS**. They sound scary but each solves a simple problem.

---

## Problem 1 — "What is the current state of this order?"

Traditional approach: store the current state in a database row.

```
orders table:
| id | status    | updated_at |
|----|-----------|------------|
| 1  | PREPARING | 2024-01-01 |
```

**Problem**: you lost history. You can't answer "when did it go from CONFIRMED to PREPARING?" or "what was it before?".

**Event Sourcing solution**: never update. Only append. Store every _thing that happened_.

```
order_events collection (MongoDB):
| orderId | version | eventType      | occurredOn          |
|---------|---------|----------------|---------------------|
| abc     | 1       | OrderCreated   | 2024-01-01 10:00:00 |
| abc     | 2       | OrderConfirmed | 2024-01-01 10:01:00 |
| abc     | 3       | OrderPreparing | 2024-01-01 10:05:00 |
```

To get the current state: replay all events from the beginning. Each event mutates the state in order.

---

## Problem 2 — "Reading the current state is slow if I replay events every time"

**CQRS solution**: maintain a separate, pre-computed read table (a "projection") in PostgreSQL.

```
orders_read table (PostgreSQL):
| id  | status    | restaurantName | total | ... |
|-----|-----------|----------------|-------|-----|
| abc | PREPARING | KFC            | 25.00 | ... |
```

Every time an event fires, a **projection** updates this table immediately. Queries go to PostgreSQL — fast, simple SQL. Writes go to MongoDB — append-only, never loses history.

---

## Two databases, two jobs

| Database   | What it stores              | Used for                   |
| ---------- | --------------------------- | -------------------------- |
| MongoDB    | Event stream (append-only)  | Rebuilding aggregate state |
| PostgreSQL | Current state (read models) | Answering GET requests     |

---

## The four main building blocks

```
┌─────────────────────────────────────────────────────────────────┐
│                        Order Service                            │
│                                                                 │
│  ┌──────────────┐    ┌───────────────┐    ┌─────────────────┐  │
│  │  Controller  │───▶│    Service    │───▶│  Order Aggregate│  │
│  │  (HTTP)      │    │ (orchestrate) │    │  (state machine)│  │
│  └──────────────┘    └───────┬───────┘    └─────────────────┘  │
│                              │                                  │
│                    ┌─────────▼──────────┐                       │
│                    │   EventStoreService│                       │
│                    │   (MongoDB)        │                       │
│                    └─────────┬──────────┘                       │
│                              │ emits events in-process          │
│                    ┌─────────▼──────────┐                       │
│                    │ OrderReadProjection│                       │
│                    │   (PostgreSQL)     │                       │
│                    └────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

1. **OrderAggregate** — the domain object. Knows the rules (e.g. "you can't confirm an order that isn't PENDING"). Lives only in memory.
2. **EventStoreService** — saves events to MongoDB and loads them back.
3. **OrderReadProjection** — listens for events and keeps PostgreSQL up to date.
4. **OrdersService** — coordinates all of the above for each HTTP request.
