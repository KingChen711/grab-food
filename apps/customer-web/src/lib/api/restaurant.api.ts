import { apiClient } from './client'

type Wrapped<T> = { data: T }

export interface OperatingHour {
  id: string
  dayOfWeek: string
  openTime: string
  closeTime: string
  isClosed: boolean
}

export interface Restaurant {
  id: string
  name: string
  slug: string
  description: string | null
  coverImageUrl: string | null
  logoUrl: string | null
  fullAddress: string
  city: string
  country: string
  lat: number
  lng: number
  phone: string
  cuisineTypes: string[]
  priceRange: number
  status: string
  isOpen: boolean
  avgRating: number
  totalReviews: number
  totalOrders: number
  avgPrepTimeMinutes: number
  minOrderAmount: number
  deliveryFee: number
  operatingHours: OperatingHour[]
}

export interface MenuItemVariant {
  id: string
  name: string
  priceAdjustment: number
  isDefault: boolean
}

export interface MenuItemAddon {
  id: string
  name: string
  price: number
  maxQuantity: number
  isRequired: boolean
}

export interface MenuItem {
  id: string
  restaurantId: string
  categoryId: string
  name: string
  description: string | null
  imageUrl: string | null
  basePrice: number
  currency: string
  isAvailable: boolean
  prepTimeMinutes: number
  calories: number | null
  tags: string[]
  isVegetarian: boolean
  isVegan: boolean
  isGlutenFree: boolean
  isHalal: boolean
  isSpicy: boolean
  spicyLevel: 1 | 2 | 3 | null
  variants: MenuItemVariant[]
  addons: MenuItemAddon[]
}

export interface MenuCategory {
  id: string
  restaurantId: string
  name: string
  description: string | null
  sortOrder: number
  items: MenuItem[]
}

export interface Review {
  id: string
  restaurantId: string
  userId: string
  orderId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment: string | null
  images: string[] | null
  ownerReply: string | null
  ownerRepliedAt: string | null
  createdAt: string
}

export const restaurantApi = {
  getBySlug: (slug: string): Promise<Restaurant> =>
    apiClient.get<Wrapped<Restaurant>>(`/restaurants/by-slug/${slug}`).then((r) => r.data.data),

  getById: (id: string): Promise<Restaurant> =>
    apiClient.get<Wrapped<Restaurant>>(`/restaurants/${id}`).then((r) => r.data.data),

  getMenu: (restaurantId: string): Promise<MenuCategory[]> =>
    apiClient
      .get<Wrapped<MenuCategory[]>>(`/restaurants/${restaurantId}/menu`)
      .then((r) => r.data.data),

  getReviews: (
    restaurantId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{ items: Review[]; total: number }> =>
    apiClient
      .get<Wrapped<{ items: Review[]; total: number }>>(`/restaurants/${restaurantId}/reviews`, {
        params,
      })
      .then((r) => r.data.data),
}
