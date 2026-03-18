# 5. Snapshots

## The problem with replaying all events

Event sourcing requires replaying every event to get the current state. For most orders this is fine — an order might have 5–10 events total.

But imagine a high-volume order that has been modified 200 times (e.g. multiple refund attempts, disputes, adjustments). Loading it would mean fetching 200 documents from MongoDB and running 200 `when()` calls every single time.

**Snapshots** solve this: periodically save the full current state so you don't have to replay everything from the beginning.

---

## How snapshots work here

```typescript
// src/orders/event-store/event-store.service.ts

const SNAPSHOT_THRESHOLD = 50

public async append(aggregate: OrderAggregate): Promise<void> {
  // ... save events ...

  // After saving, check if it's time to take a snapshot
  if (aggregate.version % SNAPSHOT_THRESHOLD === 0) {
    await this.saveSnapshot(aggregate)
  }
}
```

Every **50 events**, a snapshot is taken automatically. You don't need to think about it.

### What a snapshot looks like in MongoDB (`order_snapshots` collection)

```json
{
  "streamId": "abc-123",
  "version": 50,
  "takenAt": "2024-01-01T12:00:00Z",
  "state": {
    "id": "abc-123",
    "customerId": "customer-456",
    "restaurantId": "restaurant-789",
    "status": "COMPLETED",
    "items": [...],
    "subtotal": 25.00,
    "deliveryFee": 3.00,
    "tax": 2.00,
    "total": 30.00,
    "deliveryAddress": { ... },
    "version": 50
  }
}
```

The `state` field is just the output of `aggregate.toSnapshot()` — a plain object copy of all the aggregate's fields.

---

## Loading with snapshot optimization

Without snapshots:

```
Load order: fetch events 1–53 → replay 53 events
```

With a snapshot at version 50:

```
Load order: load snapshot (v50) + fetch events 51–53 → replay only 3 events
```

```typescript
public async load(orderId: string): Promise<OrderAggregate | null> {
  // 1. Try to find the most recent snapshot
  const snapshot = await this.snapshotModel
    .findOne({ streamId: orderId })
    .sort({ version: -1 })   // ← "most recent" = highest version
    .lean()
    .exec()

  let aggregate: OrderAggregate
  let fromVersion = 0

  if (snapshot) {
    // 2a. Found snapshot — restore it
    aggregate = OrderAggregate.fromSnapshot(snapshot.state)
    fromVersion = snapshot.version  // only load events AFTER this version
  } else {
    // 2b. No snapshot — start fresh
    aggregate = new OrderAggregate()
  }

  // 3. Load only events after the snapshot (or all events if no snapshot)
  const storedEvents = await this.eventModel
    .find({ streamId: orderId, version: { $gt: fromVersion } })
    .sort({ version: 1 })
    .exec()

  // 4. Replay the remaining events
  aggregate.loadFromHistory(storedEvents)

  return aggregate
}
```

### `fromSnapshot()` — restoring from a saved state

```typescript
// src/orders/domain/order.aggregate.ts

static fromSnapshot(state: Record<string, unknown>): OrderAggregate {
  const aggregate = new OrderAggregate()
  Object.assign(aggregate, state)  // copy all fields from the snapshot
  return aggregate
}
```

`Object.assign` just copies every key from the snapshot object onto the aggregate. Since `toSnapshot()` includes every field (`id`, `status`, `items`, `version`, etc.), the restored aggregate is identical to what it was when the snapshot was taken.

---

## Visual summary

```
Events in MongoDB for order "abc":

v1  OrderCreated
v2  OrderConfirmed
...
v50 OrderCompleted        ← snapshot taken here (state saved separately)
v51 OrderRefunded
v52 ...

Loading "abc":
  ┌──────────────────────────────────────────────────┐
  │ 1. Find snapshot at v50 → restore state          │
  │ 2. Fetch events v51, v52 from MongoDB            │
  │ 3. Replay only v51, v52                          │
  │ Result: aggregate at current state               │
  └──────────────────────────────────────────────────┘

Without snapshot:
  ┌──────────────────────────────────────────────────┐
  │ 1. Fetch events v1 → v52 (all 52!)               │
  │ 2. Replay all 52 events                          │
  └──────────────────────────────────────────────────┘
```

---

## Why 50 events as the threshold?

For a food delivery order, 50 events is extremely high — a normal order might have 7–9 events total. So in practice, snapshots will rarely trigger for a standard order.

The threshold is there as a **safety net** for edge cases: disputed orders, refund cycles, or administrative modifications. You can change `SNAPSHOT_THRESHOLD` in `event-store.service.ts` if needed.
