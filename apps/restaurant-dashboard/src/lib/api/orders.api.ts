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

export interface Order {
  id: string
  customerId: string
  restaurantId: string
  restaurantName: string
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
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

export const ordersApi = {
  byRestaurant: (restaurantId: string): Promise<Order[]> =>
    apiClient.get<Wrapped<Order[]>>(`/orders/restaurant/${restaurantId}`).then((r) => r.data.data),

  getById: (id: string): Promise<Order> =>
    apiClient.get<Wrapped<Order>>(`/orders/${id}`).then((r) => r.data.data),

  confirm: (id: string, estimatedPrepTimeMinutes: number): Promise<void> =>
    apiClient.patch(`/orders/${id}/confirm`, { estimatedPrepTimeMinutes }).then(() => undefined),

  startPreparing: (id: string): Promise<void> =>
    apiClient.patch(`/orders/${id}/prepare`).then(() => undefined),

  markReady: (id: string): Promise<void> =>
    apiClient.patch(`/orders/${id}/ready`).then(() => undefined),

  cancel: (id: string, reason: string, note?: string): Promise<void> =>
    apiClient.patch(`/orders/${id}/cancel`, { reason, note }).then(() => undefined),
}
