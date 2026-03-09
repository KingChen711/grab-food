import type { DomainEvent } from './common.types'
import type { OrderStatus } from './order.types'

// ─── User Events ──────────────────────────────────────────────────────────────

export type UserRegisteredEvent = DomainEvent<{
  userId: string
  email?: string
  phone?: string
  role: string
}>

export type UserVerifiedEvent = DomainEvent<{
  userId: string
  verifiedAt: string
}>

// ─── Order Events ────────────────────────────────────────────────────────────

export type OrderCreatedEvent = DomainEvent<{
  orderId: string
  customerId: string
  restaurantId: string
  items: Array<{ menuItemId: string; quantity: number; price: number }>
  total: number
  deliveryAddress: Record<string, unknown>
}>

export type OrderStatusChangedEvent = DomainEvent<{
  orderId: string
  previousStatus: OrderStatus
  newStatus: OrderStatus
  actorId?: string
  actorType?: string
  reason?: string
}>

export type OrderCancelledEvent = DomainEvent<{
  orderId: string
  reason: string
  cancelledBy: string
  refundAmount?: number
}>

// ─── Payment Events ──────────────────────────────────────────────────────────

export type PaymentSucceededEvent = DomainEvent<{
  paymentId: string
  orderId: string
  userId: string
  amount: number
  method: string
}>

export type PaymentFailedEvent = DomainEvent<{
  paymentId: string
  orderId: string
  userId: string
  reason: string
}>

export type RefundProcessedEvent = DomainEvent<{
  refundId: string
  paymentId: string
  orderId: string
  amount: number
}>

// ─── Delivery Events ─────────────────────────────────────────────────────────

export type DriverAssignedEvent = DomainEvent<{
  deliveryId: string
  orderId: string
  driverId: string
  restaurantLocation: { lat: number; lng: number }
  customerLocation: { lat: number; lng: number }
}>

export type DriverLocationUpdatedEvent = DomainEvent<{
  driverId: string
  orderId?: string
  lat: number
  lng: number
  heading: number
  speed: number
}>

export type DeliveryCompletedEvent = DomainEvent<{
  deliveryId: string
  orderId: string
  driverId: string
  completedAt: string
  distanceKm: number
  durationMinutes: number
}>

// ─── Restaurant Events ───────────────────────────────────────────────────────

export type RestaurantApprovedEvent = DomainEvent<{
  restaurantId: string
  ownerId: string
  approvedBy: string
}>

export type MenuItemUpdatedEvent = DomainEvent<{
  menuItemId: string
  restaurantId: string
  changes: Record<string, unknown>
}>

export type InventoryOutOfStockEvent = DomainEvent<{
  menuItemId: string
  restaurantId: string
  itemName: string
}>

// ─── Notification Events ─────────────────────────────────────────────────────

export type NotificationRequestedEvent = DomainEvent<{
  userId: string
  type: string
  channels: string[]
  title: string
  body: string
  data?: Record<string, unknown>
}>

// ─── All Events Union ────────────────────────────────────────────────────────

export type PlatformEvent =
  | UserRegisteredEvent
  | UserVerifiedEvent
  | OrderCreatedEvent
  | OrderStatusChangedEvent
  | OrderCancelledEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | RefundProcessedEvent
  | DriverAssignedEvent
  | DriverLocationUpdatedEvent
  | DeliveryCompletedEvent
  | RestaurantApprovedEvent
  | MenuItemUpdatedEvent
  | InventoryOutOfStockEvent
  | NotificationRequestedEvent

export const EventTopics = {
  // User
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  // Order
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status.changed',
  ORDER_CANCELLED: 'order.cancelled',
  // Payment
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_PROCESSED: 'refund.processed',
  // Delivery
  DRIVER_ASSIGNED: 'delivery.driver.assigned',
  DRIVER_LOCATION_UPDATED: 'delivery.location.updated',
  DELIVERY_COMPLETED: 'delivery.completed',
  // Restaurant
  RESTAURANT_APPROVED: 'restaurant.approved',
  MENU_ITEM_UPDATED: 'restaurant.menu.item.updated',
  INVENTORY_OUT_OF_STOCK: 'restaurant.inventory.out_of_stock',
  // Notification
  NOTIFICATION_REQUESTED: 'notification.requested',
} as const

export type EventTopic = (typeof EventTopics)[keyof typeof EventTopics]
