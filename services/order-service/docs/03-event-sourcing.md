# 3. Event Sourcing & Event Store

## The core idea

Instead of storing **what an order looks like right now**, we store **everything that ever happened to it**.

Think of it like a bank account:

```
Traditional DB:  "Your balance is $250"   ← you only know the result

Event Sourcing:
  Deposited $500
  Withdrew  $100
  Withdrew  $150
  ─────────────
  Balance = $250   ← you can calculate the result AND see the full history
```

For orders:

```
Traditional DB:  { id: "abc", status: "PREPARING" }

Event Sourcing:
  OrderCreated    (v1) — customer placed order
  OrderConfirmed  (v2) — restaurant accepted, prep time = 15min
  OrderPreparing  (v3) — kitchen started cooking
  ────────────────────────────────────────────
  Replay all 3 events → status = "PREPARING"
```

---

## The OrderAggregate

The aggregate is **the in-memory representation** of an order. It has no database connection. It is just a TypeScript class that holds state and rules.

### Creating a new order

```typescript
// OrderAggregate.create() is a factory method
const aggregate = OrderAggregate.create(
  orderId,
  customerId,
  restaurantId,
  restaurantName,
  items,
  subtotal,
  deliveryFee,
  tax,
  total,
  deliveryAddress,
)
```

Internally this calls `apply(new OrderCreatedEvent(...))`.

### What does `apply()` do?

```typescript
// src/orders/domain/order.aggregate.ts

private apply(event: BaseOrderEvent): void {
  this.when(event)              // 1. mutate the state NOW
  this.uncommittedEvents.push(event)  // 2. remember it for saving later
  this.version++                // 3. increment the version counter
}
```

Three things happen:

1. **`when(event)`** — updates `this.status`, `this.driverId`, etc. based on which event it is.
2. **`uncommittedEvents.push`** — adds the event to a temporary list so the service can save it to MongoDB.
3. **`version++`** — each event is numbered sequentially. Used to detect conflicts and for snapshots.

### What does `when()` do?

`when()` is a big switch statement. It maps each event type to a state change:

```typescript
private when(event: BaseOrderEvent): void {
  if (event instanceof OrderCreatedEvent) {
    this.id = event.orderId
    this.status = 'CREATED'
    this.items = event.items
    // ... etc
  } else if (event instanceof OrderConfirmedEvent) {
    this.status = 'CONFIRMED'
    this.estimatedPrepTimeMinutes = event.estimatedPrepTimeMinutes
  } else if (event instanceof OrderPreparingEvent) {
    this.status = 'PREPARING'
  }
  // ... and so on for every event type
}
```

### Replaying history (loading an existing order)

When you load an order from storage, you **replay** its events:

```typescript
// This is called by EventStoreService.load()
aggregate.loadFromHistory([
  { eventType: 'OrderCreated',   data: {...}, version: 1 },
  { eventType: 'OrderConfirmed', data: {...}, version: 2 },
  { eventType: 'OrderPreparing', data: {...}, version: 3 },
])
```

`loadFromHistory` calls `when(event)` for each event but does NOT call `uncommittedEvents.push()` — because these events are already saved. We're just re-running them to rebuild current state.

```
          apply()                      loadFromHistory()
          ───────                      ─────────────────
when()      ✅  mutates state           ✅  mutates state
push()      ✅  records for saving      ❌  already saved
version++   ✅  increments              sets to stored version
```

---

## The Event Store (MongoDB)

The EventStoreService is responsible for:

1. **Saving** new events from an aggregate to MongoDB
2. **Loading** an aggregate back by replaying its events

### MongoDB collection: `order_events`

```json
{
  "streamId": "abc-123",     ← the orderId
  "version": 3,              ← sequential number, unique per order
  "eventType": "OrderPreparing",
  "data": {
    "orderId": "abc-123",
    "occurredOn": "2024-01-01T10:05:00Z"
  },
  "occurredOn": "2024-01-01T10:05:00Z"
}
```

The compound index `{ streamId: 1, version: 1 }` is **unique** — it is impossible to save two events with the same version for the same order. This prevents data corruption if two requests try to modify the same order at the same time.

### Saving events: `append()`

```typescript
public async append(aggregate: OrderAggregate): Promise<void> {
  const events = aggregate.getUncommittedEvents()
  if (events.length === 0) return

  // Convert each event object to a plain document for MongoDB
  const docs = events.map((event, i) => ({
    streamId: aggregate.id,
    version: aggregate.version - events.length + i + 1,
    eventType: event.constructor.name.replace('Event', ''),
    //         e.g. "OrderPreparingEvent" → "OrderPreparing"
    data: { ...event },
    occurredOn: event.occurredOn,
  }))

  await this.eventModel.insertMany(docs)  // atomic batch insert
  aggregate.clearUncommittedEvents()      // clean up the temp list
}
```

### Loading an order: `load()`

```typescript
public async load(orderId: string): Promise<OrderAggregate | null> {
  // Step 1: find the latest snapshot (if any)
  const snapshot = await this.snapshotModel
    .findOne({ streamId: orderId })
    .sort({ version: -1 })
    .exec()

  let aggregate: OrderAggregate
  let fromVersion = 0

  if (snapshot) {
    // Start from snapshot instead of from event #1
    aggregate = OrderAggregate.fromSnapshot(snapshot.state)
    fromVersion = snapshot.version
  } else {
    aggregate = new OrderAggregate()
  }

  // Step 2: load only events AFTER the snapshot version
  const storedEvents = await this.eventModel
    .find({ streamId: orderId, version: { $gt: fromVersion } })
    .sort({ version: 1 })
    .exec()

  // Step 3: replay them
  aggregate.loadFromHistory(storedEvents)

  return aggregate
}
```

---

## Event classes

Every event extends `BaseOrderEvent`:

```typescript
// src/orders/domain/events/base-order.event.ts
export abstract class BaseOrderEvent {
  public readonly orderId: string
  public readonly occurredOn: Date = new Date() // timestamp auto-set

  constructor(orderId: string) {
    this.orderId = orderId
  }
}
```

Each specific event adds its own extra data:

```typescript
// OrderConfirmedEvent carries extra info: who confirmed it and the prep time
export class OrderConfirmedEvent extends BaseOrderEvent {
  constructor(
    orderId: string,
    public readonly restaurantId: string,
    public readonly estimatedPrepTimeMinutes: number,
  ) {
    super(orderId)
  }
}

// OrderPreparingEvent has no extra data — just the fact it happened
export class OrderPreparingEvent extends BaseOrderEvent {
  constructor(orderId: string) {
    super(orderId)
  }
}
```

---

## Why MongoDB for the event store?

| Reason             | Explanation                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| Append-only writes | MongoDB is very fast at inserting new documents                                   |
| Schema flexibility | Each event type has different `data` fields — a JSON store handles this naturally |
| No updates needed  | Event store never updates or deletes — perfect fit for MongoDB                    |
| Rich querying      | Can query by `streamId`, `version` range, `eventType` easily                      |

PostgreSQL could also work for an event store, but MongoDB's document model makes it a natural choice when each event has its own shape.
