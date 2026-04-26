import { apiClient } from './client'

type Wrapped<T> = { data: T }

export interface SelectedVariant {
  id: string
  name: string
  priceAdjustment: number
}

export interface SelectedAddon {
  id: string
  name: string
  price: number
}

export interface CartItem {
  cartItemId: string
  menuItemId: string
  menuItemName: string
  menuItemImageUrl?: string
  quantity: number
  selectedVariant?: SelectedVariant
  selectedAddons: SelectedAddon[]
  notes?: string
  unitPrice: number
  totalPrice: number
}

export interface Cart {
  id: string
  userId: string
  restaurantId: string
  restaurantName: string
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  tax: number
  discount: number
  total: number
  appliedPromotionCode?: string
  updatedAt: string
}

export interface AddItemInput {
  restaurantId: string
  restaurantName: string
  menuItemId: string
  menuItemName: string
  menuItemImageUrl?: string
  basePrice: number
  quantity: number
  selectedVariant?: SelectedVariant
  selectedAddons?: SelectedAddon[]
  notes?: string
}

export interface CheckoutInput {
  deliveryAddress: {
    label?: string
    address: string
    lat: number
    lng: number
    notes?: string
  }
  deliveryFee?: number
  notes?: string
  scheduledFor?: string
}

export const cartApi = {
  get: (): Promise<Cart | null> =>
    apiClient.get<Wrapped<Cart | null>>('/cart').then((r) => r.data.data),

  addItem: (input: AddItemInput): Promise<Cart> =>
    apiClient.post<Wrapped<Cart>>('/cart/items', input).then((r) => r.data.data),

  updateQuantity: (cartItemId: string, quantity: number): Promise<Cart> =>
    apiClient
      .patch<Wrapped<Cart>>(`/cart/items/${cartItemId}`, { quantity })
      .then((r) => r.data.data),

  removeItem: (cartItemId: string): Promise<Cart> =>
    apiClient.delete<Wrapped<Cart>>(`/cart/items/${cartItemId}`).then((r) => r.data.data),

  clear: (): Promise<void> => apiClient.delete('/cart').then(() => undefined),

  applyPromo: (code: string): Promise<Cart> =>
    apiClient.post<Wrapped<Cart>>('/cart/promo', { code }).then((r) => r.data.data),

  removePromo: (): Promise<Cart> =>
    apiClient.delete<Wrapped<Cart>>('/cart/promo').then((r) => r.data.data),

  reorder: (orderId: string): Promise<Cart> =>
    apiClient.post<Wrapped<Cart>>(`/cart/from-order/${orderId}`).then((r) => r.data.data),

  checkout: (input: CheckoutInput): Promise<{ orderId: string }> =>
    apiClient.post<Wrapped<{ orderId: string }>>('/cart/checkout', input).then((r) => r.data.data),
}
