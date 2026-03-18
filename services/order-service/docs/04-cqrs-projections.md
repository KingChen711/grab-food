# 4. CQRS & Projections

## What is CQRS?

**CQRS** = Command Query Responsibility Segregation.

It means: **separate the code that writes data from the code that reads data**.

```
Traditional:  one model, one database → reads and writes go to the same table
CQRS:         write model (events in MongoDB) ≠ read model (rows in PostgreSQL)
```

### Why bother?

**Writing** an order requires complex business rules (state machine, validation). It uses the `OrderAggregate`.

**Reading** an order (for displaying to the user) just needs fast, simple SQL: `SELECT * FROM orders_read WHERE customerId = ?`. No business rules needed.

If you mix both into one model, you end up with a messy compromise: too rigid for writes, too complex for reads. CQRS lets you optimize each side independently.

---

## The write side

When a command comes in (e.g. "confirm this order"):

1. Load the aggregate from the event store (replay events)
2. Call the business method (`aggregate.confirm(15)`)
3. Save the new events to MongoDB
4. Emit the event in-process

```typescript
// OrdersService.confirmOrder()
public async confirmOrder(orderId: string, dto: ConfirmOrderDto): Promise<void> {
  const aggregate = await this.loadOrFail(orderId)  // load from MongoDB
  aggregate.confirm(dto.estimatedPrepTimeMinutes)    // business logic
  await this.persistAndEmit(aggregate)               // save + emit
}
```

---

## The read side

The **projection** listens to events and keeps PostgreSQL up to date.

```typescript
// src/orders/projections/order-read.projection.ts

@OnEvent('OrderConfirmed')
public async onOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
  await this.orderRepo.update(event.orderId, {
    status: 'CONFIRMED',
    estimatedPrepTimeMinutes: event.estimatedPrepTimeMinutes,
  })
  await this.addTimeline(event.orderId, 'CONFIRMED', event.occurredOn)
}
```

When the `OrdersService` fires `this.eventEmitter.emit('OrderConfirmed', event)`, NestJS's EventEmitter delivers it to this method automatically (because of the `@OnEvent('OrderConfirmed')` decorator).

---

## The three PostgreSQL tables

### `orders_read` — main order row

One row per order. Contains all the "current state" fields for fast lookups.

```sql
SELECT * FROM orders_read WHERE customer_id = '...' ORDER BY created_at DESC;
```

Fields include: `id`, `customerId`, `restaurantId`, `status`, `total`, `deliveryAddress`, etc.

### `order_items_read` — line items

Each item in the order gets its own row. Linked to `orders_read` via `orderId`.

```sql
SELECT * FROM order_items_read WHERE order_id = '...';
```

This is a standard one-to-many relationship — one order has many items.

### `order_timeline` — status history

Every time the status changes, a new timeline row is added. This gives you the full history of when each status happened — without needing to replay events.

```sql
SELECT status, occurred_on FROM order_timeline
WHERE order_id = '...'
ORDER BY occurred_on ASC;

-- Result:
-- CREATED    | 2024-01-01 10:00:00
-- CONFIRMED  | 2024-01-01 10:01:00
-- PREPARING  | 2024-01-01 10:05:00
-- READY      | 2024-01-01 10:20:00
-- PICKED_UP  | 2024-01-01 10:25:00
-- DELIVERING | 2024-01-01 10:26:00
-- DELIVERED  | 2024-01-01 10:45:00
```

---

## How the projection handles each event

| Event             | What projection does                                        |
| ----------------- | ----------------------------------------------------------- |
| `OrderCreated`    | INSERT into `orders_read` + INSERT items + add timeline row |
| `OrderConfirmed`  | UPDATE `status = CONFIRMED`, set `estimatedPrepTimeMinutes` |
| `OrderPreparing`  | UPDATE `status = PREPARING`                                 |
| `OrderReady`      | UPDATE `status = READY`                                     |
| `OrderPickedUp`   | UPDATE `status = PICKED_UP`, set `driverId`                 |
| `OrderDelivering` | UPDATE `status = DELIVERING`                                |
| `OrderDelivered`  | UPDATE `status = DELIVERED`                                 |
| `OrderCompleted`  | UPDATE `status = COMPLETED`, set `completedAt`              |
| `OrderCancelled`  | UPDATE `status = CANCELLED`, set `cancellationReason/note`  |
| `OrderRefunded`   | UPDATE `status = REFUNDED`                                  |

Every handler also calls `addTimeline()` to record the status change with a timestamp.

---

## Is the read side always in sync?

In this implementation: **yes**, because the event is emitted synchronously after saving to MongoDB — both happen in the same process, in the same request.

```typescript
private async persistAndEmit(aggregate: OrderAggregate): Promise<void> {
  await this.eventStore.append(aggregate)   // 1. save to MongoDB
  this.eventEmitter.emit(eventName, event)  // 2. emit → projection runs immediately
}
```

The projection runs within the same HTTP request. By the time the API responds, both MongoDB and PostgreSQL are already updated.

> **Note for future**: in a microservices setup, you'd publish to Kafka instead. The projection would be a separate consumer. This introduces _eventual consistency_ — there's a brief delay between write and read. That's a common trade-off in large systems.

---

## Reading data

Queries go straight to PostgreSQL — no event replay needed:

```typescript
// OrdersService

public async findById(orderId: string): Promise<OrderRead> {
  return this.orderReadRepo.findOne({ where: { id: orderId } })
  // ↑ simple SELECT FROM orders_read WHERE id = ?
}

public async findByCustomer(customerId: string): Promise<OrderRead[]> {
  return this.orderReadRepo.find({
    where: { customerId },
    order: { createdAt: 'DESC' },
  })
  // ↑ simple SELECT FROM orders_read WHERE customer_id = ? ORDER BY created_at DESC
}
```

This is the main benefit of CQRS: **reads are as simple as possible** — just plain SQL.
