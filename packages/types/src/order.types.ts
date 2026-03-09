import type { Address, ID, Timestamp } from './common.types'
import type { MenuItem, MenuItemAddon, MenuItemVariant } from './restaurant.types'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'CREATED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'

export type CancellationReason =
  | 'customer_request'
  | 'restaurant_declined'
  | 'restaurant_closed'
  | 'item_unavailable'
  | 'driver_not_found'
  | 'payment_failed'
  | 'system_error'

export type SagaStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'COMPENSATING' | 'FAILED'

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  menuItemId: ID
  menuItem?: MenuItem
  quantity: number
  selectedVariant?: MenuItemVariant
  selectedAddons: MenuItemAddon[]
  notes?: string
  unitPrice: number
  totalPrice: number
}

export interface Cart {
  id: ID
  userId: ID
  restaurantId: ID
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  tax: number
  discount: number
  total: number
  appliedPromotionCode?: string
  updatedAt: Timestamp
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: ID
  orderId: ID
  menuItemId: ID
  menuItemName: string
  menuItemImageUrl?: string
  quantity: number
  variantName?: string
  addonNames: string[]
  notes?: string
  unitPrice: number
  totalPrice: number
}

export interface Order {
  id: ID
  customerId: ID
  restaurantId: ID
  restaurantName: string
  driverId?: ID
  status: OrderStatus
  items: OrderItem[]
  deliveryAddress: Address
  subtotal: number
  deliveryFee: number
  tax: number
  discount: number
  tip: number
  total: number
  currency: string
  notes?: string
  estimatedPrepTime: number
  estimatedDeliveryTime: number
  actualDeliveredAt?: Timestamp
  cancellationReason?: CancellationReason
  cancellationNote?: string
  scheduledFor?: Timestamp
  proofOfDeliveryUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Order Timeline ───────────────────────────────────────────────────────────

export interface OrderTimelineEntry {
  status: OrderStatus
  timestamp: Timestamp
  note?: string
  actorId?: ID
  actorType?: 'customer' | 'restaurant' | 'driver' | 'system'
}

export interface OrderWithTimeline extends Order {
  timeline: OrderTimelineEntry[]
}

// ─── Event Sourcing ───────────────────────────────────────────────────────────

export interface OrderEvent {
  streamId: string
  version: number
  eventType: OrderEventType
  data: Record<string, unknown>
  metadata: {
    correlationId: string
    causationId?: string
    userId: string
  }
  timestamp: Timestamp
}

export type OrderEventType =
  | 'OrderCreated'
  | 'OrderConfirmed'
  | 'OrderPreparing'
  | 'OrderReady'
  | 'OrderPickedUp'
  | 'OrderDelivering'
  | 'OrderDelivered'
  | 'OrderCompleted'
  | 'OrderCancelled'
  | 'OrderRefunded'
  | 'PaymentProcessed'
  | 'DriverAssigned'
  | 'DriverUnassigned'

// ─── Saga ─────────────────────────────────────────────────────────────────────

export interface SagaState {
  sagaId: string
  orderId: ID
  status: SagaStatus
  completedSteps: string[]
  currentStep?: string
  context: Record<string, unknown>
  error?: string
  startedAt: Timestamp
  completedAt?: Timestamp
  updatedAt: Timestamp
}

// ─── Delivery Tracking ────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'ASSIGNED'
  | 'HEADING_TO_RESTAURANT'
  | 'AT_RESTAURANT'
  | 'PICKED_UP'
  | 'HEADING_TO_CUSTOMER'
  | 'ARRIVED'
  | 'COMPLETED'

export interface Delivery {
  id: ID
  orderId: ID
  driverId: ID
  status: DeliveryStatus
  pickupAddress: Address
  dropoffAddress: Address
  distanceKm: number
  estimatedDurationMinutes: number
  actualDurationMinutes?: number
  driverFee: number
  tip: number
  assignedAt: Timestamp
  pickedUpAt?: Timestamp
  completedAt?: Timestamp
}

export interface LiveTrackingData {
  orderId: ID
  driverId: ID
  driverName: string
  driverPhone: string
  driverAvatarUrl?: string
  vehicleType: string
  licensePlate: string
  currentLocation: {
    lat: number
    lng: number
    heading: number
    speed: number
  }
  estimatedArrival: Timestamp
  remainingDistanceKm: number
  routePolyline?: string
  status: DeliveryStatus
  updatedAt: Timestamp
}
