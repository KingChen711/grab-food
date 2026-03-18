# 6. Request Flow — End to End

This page traces exactly what happens in the code for two example requests.

---

## Example 1: Customer places a new order

**Request**: `POST /orders`

```json
{
  "restaurantId": "rest-111",
  "restaurantName": "KFC",
  "items": [{ "menuItemId": "item-1", "menuItemName": "Burger", "unitPrice": 10, "quantity": 2 }],
  "subtotal": 20,
  "deliveryFee": 3,
  "tax": 2,
  "total": 25,
  "deliveryAddress": { "address": "123 Main St", "lat": 1.3, "lng": 103.8 }
}
```

### Step-by-step

```
1. OrdersController.create()
   └─ validates input with class-validator (DTO decorators)
   └─ calls OrdersService.createOrder("customer-abc", dto)

2. OrdersService.createOrder()
   └─ generates a new UUID for orderId
   └─ maps dto.items → OrderItem[] (adds id, totalPrice, etc.)
   └─ calls OrderAggregate.create(orderId, customerId, ...)

3. OrderAggregate.create()   ← in memory, no DB yet
   └─ new OrderAggregate()
   └─ apply(new OrderCreatedEvent(...))
      ├─ when(event) → sets this.status = 'CREATED', this.items = [...], etc.
      ├─ uncommittedEvents.push(event)
      └─ version++ → version = 1

4. OrdersService.persistAndEmit(aggregate)
   ├─ events = aggregate.getUncommittedEvents()  → [OrderCreatedEvent]
   ├─ eventStore.append(aggregate)
   │    ├─ inserts { streamId: orderId, version: 1, eventType: 'OrderCreated', data: {...} }
   │    │    into MongoDB "order_events" collection
   │    └─ aggregate.clearUncommittedEvents()
   └─ eventEmitter.emit('OrderCreated', event)

5. OrderReadProjection.onOrderCreated(event)   ← triggered by EventEmitter
   ├─ INSERT INTO orders_read (id, customerId, restaurantId, status='CREATED', ...)
   ├─ INSERT INTO order_items_read (menuItemId, menuItemName, unitPrice, quantity, ...)
   └─ INSERT INTO order_timeline (orderId, status='CREATED', occurredOn=now)

6. Response: { orderId: "abc-123" }   ← returned to the customer
```

**Data after this request:**

MongoDB `order_events`:

```json
{ "streamId": "abc-123", "version": 1, "eventType": "OrderCreated", "data": {...} }
```

PostgreSQL `orders_read`:

```
id=abc-123 | status=CREATED | restaurantName=KFC | total=25
```

---

## Example 2: Restaurant confirms the order

**Request**: `PATCH /orders/abc-123/confirm`

```json
{ "estimatedPrepTimeMinutes": 15 }
```

### Step-by-step

```
1. OrdersController.confirm("abc-123", { estimatedPrepTimeMinutes: 15 })
   └─ calls OrdersService.confirmOrder("abc-123", dto)

2. OrdersService.confirmOrder()
   └─ loadOrFail("abc-123")
      └─ eventStore.load("abc-123")
         ├─ check for snapshot → none found
         ├─ fetch all events from MongoDB: [OrderCreated(v1)]
         ├─ new OrderAggregate()
         └─ aggregate.loadFromHistory([{ eventType:'OrderCreated', data:{...}, version:1 }])
              └─ when(OrderCreatedEvent) → status = 'CREATED', items = [...], etc.
                 version = 1
         └─ returns aggregate (status='CREATED', version=1)

   ⚠️  Wait — status is CREATED, but confirm() needs PENDING!
   In this example assume status is already PENDING (payment was processed).

   └─ aggregate.confirm(15)
      └─ assertStatus('PENDING', 'confirm')  → passes if status is PENDING
      └─ apply(new OrderConfirmedEvent("abc-123", "rest-111", 15))
         ├─ when(event) → status = 'CONFIRMED', estimatedPrepTimeMinutes = 15
         ├─ uncommittedEvents.push(event)
         └─ version++ → version = 2

3. persistAndEmit(aggregate)
   ├─ eventStore.append(aggregate)
   │    └─ INSERT { streamId: "abc-123", version: 2, eventType: "OrderConfirmed", data: {...} }
   └─ eventEmitter.emit('OrderConfirmed', event)

4. OrderReadProjection.onOrderConfirmed(event)
   ├─ UPDATE orders_read SET status='CONFIRMED', estimated_prep_time_minutes=15
   │       WHERE id='abc-123'
   └─ INSERT INTO order_timeline (orderId='abc-123', status='CONFIRMED', occurredOn=now)

5. Response: 204 No Content
```

**Data after this request:**

MongoDB `order_events`:

```json
{ "streamId": "abc-123", "version": 1, "eventType": "OrderCreated", ... }
{ "streamId": "abc-123", "version": 2, "eventType": "OrderConfirmed", "data": { "estimatedPrepTimeMinutes": 15 } }
```

PostgreSQL `orders_read`:

```
id=abc-123 | status=CONFIRMED | estimatedPrepTimeMinutes=15
```

PostgreSQL `order_timeline`:

```
orderId=abc-123 | status=CREATED    | occurredOn=10:00
orderId=abc-123 | status=CONFIRMED  | occurredOn=10:01
```

---

## Example 3: GET order (read from projection)

**Request**: `GET /orders/abc-123`

```
1. OrdersController.findOne("abc-123")
   └─ OrdersService.findById("abc-123")
      └─ SELECT * FROM orders_read WHERE id = 'abc-123'
         (TypeORM also JOINs order_items_read because of eager: true)
      └─ returns { id, status, items: [...], ... }

2. Response: the full order object
```

**No MongoDB involved.** No event replay. Just a simple SQL query.
This is the CQRS payoff — reads are trivially simple.

---

## What happens if you try an invalid transition?

**Request**: `PATCH /orders/abc-123/confirm` when order is already `CONFIRMED`

```
1. eventStore.load("abc-123")
   └─ replays events → aggregate.status = 'CONFIRMED'

2. aggregate.confirm(15)
   └─ assertStatus('PENDING', 'confirm')
      └─ status is 'CONFIRMED', not 'PENDING'
      └─ throws BadRequestException:
         "Cannot confirm order: expected status PENDING, got CONFIRMED"

3. Exception bubbles up through service → controller
   HttpExceptionFilter catches it

4. Response: 400 Bad Request
   { "statusCode": 400, "message": "Cannot confirm order: expected status PENDING, got CONFIRMED" }
```

Nothing is written to MongoDB or PostgreSQL.
