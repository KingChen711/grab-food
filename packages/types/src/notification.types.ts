import type { ID, Timestamp } from './common.types'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'ORDER_STATUS'
  | 'PAYMENT'
  | 'PROMOTION'
  | 'DRIVER_ASSIGNED'
  | 'DELIVERY_UPDATE'
  | 'REVIEW_REQUEST'
  | 'SYSTEM'
  | 'CHAT'

export type NotificationChannel = 'PUSH' | 'EMAIL' | 'SMS' | 'IN_APP' | 'WEBSOCKET'

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: ID
  userId: ID
  type: NotificationType
  channel: NotificationChannel
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, unknown>
  status: NotificationStatus
  readAt?: Timestamp
  scheduledAt?: Timestamp
  sentAt?: Timestamp
  createdAt: Timestamp
}

export interface NotificationPreferences {
  userId: ID
  orderUpdates: NotificationChannelPreferences
  promotions: NotificationChannelPreferences
  systemAlerts: NotificationChannelPreferences
  updatedAt: Timestamp
}

export interface NotificationChannelPreferences {
  push: boolean
  email: boolean
  sms: boolean
  inApp: boolean
}

// ─── WebSocket Events ────────────────────────────────────────────────────────

export interface WsOrderStatusEvent {
  type: 'ORDER_STATUS_UPDATED'
  orderId: ID
  status: string
  timestamp: Timestamp
  metadata?: Record<string, unknown>
}

export interface WsDriverLocationEvent {
  type: 'DRIVER_LOCATION_UPDATED'
  orderId: ID
  driverId: ID
  location: {
    lat: number
    lng: number
    heading: number
    speed: number
  }
  eta: Timestamp
  remainingDistanceKm: number
  timestamp: Timestamp
}

export interface WsNewOrderEvent {
  type: 'NEW_ORDER_RECEIVED'
  orderId: ID
  restaurantId: ID
  orderSummary: {
    customerName: string
    totalAmount: number
    itemCount: number
    notes?: string
  }
  timestamp: Timestamp
}

export type WsEvent = WsOrderStatusEvent | WsDriverLocationEvent | WsNewOrderEvent
