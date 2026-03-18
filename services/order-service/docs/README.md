# Order Service — Documentation

This service handles the entire lifecycle of a food delivery order: from the moment a customer places it to delivery and payment completion.

## Table of Contents

1. [Overview & Architecture](./01-architecture.md)
2. [Order State Machine](./02-state-machine.md)
3. [Event Sourcing & Event Store](./03-event-sourcing.md)
4. [CQRS & Projections](./04-cqrs-projections.md)
5. [Snapshots](./05-snapshots.md)
6. [Request Flow — End to End](./06-request-flow.md)
7. [File Structure](./07-file-structure.md)
8. [API Reference](./08-api-reference.md)
9. [Environment Variables](./09-environment.md)

---

## Quick mental model

```
Customer places order
        │
        ▼
  OrdersController          ← HTTP layer, validates input
        │
        ▼
  OrdersService             ← orchestrates write + read sides
     │        │
     ▼        ▼
EventStore  EventEmitter    ← write to MongoDB, fire events in-process
(MongoDB)        │
                 ▼
         OrderReadProjection ← listens to events, updates PostgreSQL
                 │
                 ▼
         PostgreSQL tables   ← fast read queries return from here
```

The key idea: **writes go to MongoDB** (event store), **reads come from PostgreSQL** (projection).
