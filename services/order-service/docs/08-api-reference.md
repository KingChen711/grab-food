# 8. API Reference

Base URL: `http://localhost:3003`

---

## Customer Endpoints

### Create Order

```
POST /orders
Content-Type: application/json

{
  "restaurantId": "uuid",
  "restaurantName": "KFC",
  "items": [
    {
      "menuItemId": "uuid",
      "menuItemName": "Burger",
      "unitPrice": 10.00,
      "quantity": 2,
      "notes": "no onions"        // optional
    }
  ],
  "subtotal": 20.00,
  "deliveryFee": 3.00,
  "tax": 2.00,
  "total": 25.00,
  "deliveryAddress": {
    "address": "123 Main St",
    "lat": 1.3521,
    "lng": 103.8198,
    "label": "Home",              // optional
    "notes": "Ring doorbell"      // optional
  },
  "notes": "Please hurry",        // optional
  "scheduledFor": "2024-01-01T12:00:00Z"  // optional, for scheduled orders
}

Response 201:
{ "orderId": "uuid" }
```

### Get My Orders

```
GET /orders/my

Response 200: OrderRead[]
```

### Get Order by ID

```
GET /orders/:id

Response 200: OrderRead (includes items array)
Response 404: order not found
```

### Cancel Order

```
PATCH /orders/:id/cancel
Content-Type: application/json

{
  "reason": "customer_request",    // see CancellationReason below
  "cancelledBy": "customer",       // "customer" | "restaurant" | "system"
  "note": "Changed my mind"        // optional
}

Response 204: No Content
Response 400: cannot cancel in current status
Response 404: order not found
```

**CancellationReason values:**

- `customer_request`
- `restaurant_declined`
- `restaurant_closed`
- `item_unavailable`
- `driver_not_found`
- `payment_failed`
- `system_error`

---

## Restaurant Endpoints

### Get Restaurant Orders

```
GET /orders/restaurant/:restaurantId

Response 200: OrderRead[]
```

### Confirm Order (PENDING → CONFIRMED)

```
PATCH /orders/:id/confirm
Content-Type: application/json

{ "estimatedPrepTimeMinutes": 15 }

Response 204: No Content
Response 400: order not in PENDING status
```

### Start Preparing (CONFIRMED → PREPARING)

```
PATCH /orders/:id/prepare

Response 204: No Content
Response 400: order not in CONFIRMED status
```

### Mark Ready (PREPARING → READY)

```
PATCH /orders/:id/ready

Response 204: No Content
Response 400: order not in PREPARING status
```

---

## Driver Endpoints

### Pick Up Order (READY → PICKED_UP)

```
PATCH /orders/:id/pickup
Content-Type: application/json

{ "driverId": "uuid" }

Response 204: No Content
Response 400: order not in READY status
```

### Start Delivering (PICKED_UP → DELIVERING)

```
PATCH /orders/:id/delivering

Response 204: No Content
```

### Mark Delivered (DELIVERING → DELIVERED)

```
PATCH /orders/:id/deliver

Response 204: No Content
```

### Complete Order (DELIVERED → COMPLETED)

```
PATCH /orders/:id/complete

Response 204: No Content
```

---

## System Endpoints

### Refund Order

```
PATCH /orders/:id/refund
Content-Type: application/json

{
  "amount": 25,
  "reason": "Driver delivered to wrong address"
}

Response 204: No Content
Response 400: order not in refundable status (must be COMPLETED, DELIVERED, or CANCELLED)
```

---

## OrderRead response shape

```typescript
{
  id: string
  customerId: string
  restaurantId: string
  restaurantName: string
  driverId?: string
  status: OrderStatus
  subtotal: number
  deliveryFee: number
  tax: number
  total: number
  deliveryAddress: {
    address: string
    lat: number
    lng: number
    label?: string
    notes?: string
  }
  notes?: string
  estimatedPrepTimeMinutes?: number
  cancellationReason?: CancellationReason
  cancellationNote?: string
  scheduledFor?: Date
  completedAt?: Date
  version: number
  createdAt: Date
  updatedAt: Date
  items: Array<{
    id: string
    menuItemId: string
    menuItemName: string
    unitPrice: number
    quantity: number
    notes?: string
  }>
}
```

---

## Error response shape

All errors follow this format (from `HttpExceptionFilter`):

```json
{
  "statusCode": 400,
  "message": "Cannot confirm order: expected status PENDING, got CONFIRMED",
  "error": "Bad Request",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "path": "/orders/abc-123/confirm"
}
```
