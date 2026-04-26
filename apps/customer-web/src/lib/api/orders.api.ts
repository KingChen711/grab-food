import { apiClient } from './client'

type Wrapped<T> = { data: T }

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

export interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  menuItemName: string
  unitPrice: number
  quantity: number
  notes?: string
}

export interface OrderTimelineEntry {
  id: string
  orderId: string
  status: OrderStatus
  occurredAt: string
  note?: string
}

export interface Order {
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
    label?: string
    address: string
    lat: number
    lng: number
    notes?: string
  }
  notes?: string
  estimatedPrepTimeMinutes?: number
  cancellationReason?: string
  cancellationNote?: string
  scheduledFor?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  timeline?: OrderTimelineEntry[]
}

export const ordersApi = {
  myOrders: (): Promise<Order[]> =>
    apiClient.get<Wrapped<Order[]>>('/orders/my').then((r) => r.data.data),

  getById: (id: string): Promise<Order> =>
    apiClient.get<Wrapped<Order>>(`/orders/${id}`).then((r) => r.data.data),

  cancel: (id: string, reason?: string): Promise<void> =>
    apiClient
      .patch(`/orders/${id}/cancel`, { reason: reason ?? 'CUSTOMER_REQUEST' })
      .then(() => undefined),
}
