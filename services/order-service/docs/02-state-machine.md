# 2. Order State Machine

An order moves through a fixed set of statuses. It can only move **forward** (with one exception: cancellation). This is called a **state machine**.

## State diagram

```
                    ┌─────────┐
                    │ CREATED │  ◀── customer places order
                    └────┬────┘
                         │ (payment confirmed)
                         ▼
                    ┌─────────┐
                    │ PENDING │  ◀── waiting for restaurant to accept
                    └────┬────┘
                         │ restaurant.confirm(estimatedPrepTime)
                         ▼
                   ┌──────────┐
                   │CONFIRMED │  ◀── restaurant accepted
                   └────┬─────┘
                        │ restaurant.startPreparing()
                        ▼
                  ┌───────────┐
                  │ PREPARING │  ◀── kitchen is cooking
                  └─────┬─────┘
                        │ restaurant.markReady()
                        ▼
                    ┌───────┐
                    │ READY │  ◀── food is packed, waiting for driver
                    └───┬───┘
                        │ driver.pickUp(driverId)
                        ▼
                  ┌──────────┐
                  │PICKED_UP │  ◀── driver has the food
                  └────┬─────┘
                       │ driver.startDelivering()
                       ▼
                ┌────────────┐
                │ DELIVERING │  ◀── en route to customer
                └─────┬──────┘
                      │ driver.deliver()
                      ▼
                ┌───────────┐
                │ DELIVERED │  ◀── customer received food
                └─────┬─────┘
                      │ system.complete()  (auto after X minutes)
                      ▼
                ┌───────────┐
                │ COMPLETED │  ◀── order closed, payment released
                └─────┬─────┘
                      │ support.refund()
                      ▼
                ┌──────────┐
                │ REFUNDED │
                └──────────┘

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  CANCELLABLE from: CREATED, PENDING, CONFIRMED, PREPARING
  (once a driver picks up the food, cancellation is no longer allowed)

  CREATED ──┐
  PENDING ──┤──▶ CANCELLED ──▶ REFUNDED
  CONFIRMED─┤
  PREPARING─┘
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
```

## Who triggers each transition?

| Method              | Called by                  | From status                         | To status    |
| ------------------- | -------------------------- | ----------------------------------- | ------------ |
| `confirm(prepTime)` | Restaurant                 | `PENDING`                           | `CONFIRMED`  |
| `startPreparing()`  | Restaurant                 | `CONFIRMED`                         | `PREPARING`  |
| `markReady()`       | Restaurant                 | `PREPARING`                         | `READY`      |
| `pickUp(driverId)`  | Driver                     | `READY`                             | `PICKED_UP`  |
| `startDelivering()` | Driver                     | `PICKED_UP`                         | `DELIVERING` |
| `deliver()`         | Driver                     | `DELIVERING`                        | `DELIVERED`  |
| `complete()`        | System                     | `DELIVERED`                         | `COMPLETED`  |
| `cancel(reason)`    | Customer/Restaurant/System | CREATED/PENDING/CONFIRMED/PREPARING | `CANCELLED`  |
| `refund(amount)`    | Support                    | COMPLETED/DELIVERED/CANCELLED       | `REFUNDED`   |

## How the state machine is enforced in code

Every transition method calls `assertStatus()` before doing anything:

```typescript
// src/orders/domain/order.aggregate.ts

confirm(estimatedPrepTimeMinutes: number): void {
  this.assertStatus('PENDING', 'confirm')   // ← throws if not PENDING
  this.apply(new OrderConfirmedEvent(...))
}

private assertStatus(expected: OrderStatus, operation: string): void {
  if (this.status !== expected) {
    throw new BadRequestException(
      `Cannot ${operation} order: expected status ${expected}, got ${this.status}`
    )
  }
}
```

If a restaurant tries to confirm an order that is already `PREPARING`, the service throws a `400 Bad Request` immediately — no database write happens.

## Why not just use if/else checks in the controller?

The controller doesn't know business rules. The **aggregate** does. This means:

- Business rules live in one place — the aggregate.
- Tests are simple: just test the aggregate class directly.
- The HTTP layer stays thin: validate input, call service, return response.
