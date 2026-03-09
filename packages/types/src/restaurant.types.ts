import type { Address, Coordinates, ID, Timestamp } from './common.types'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type RestaurantStatus = 'pending' | 'approved' | 'active' | 'suspended' | 'closed'

export type PriceRange = 1 | 2 | 3 | 4

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

// ─── Restaurant ───────────────────────────────────────────────────────────────

export interface Restaurant {
  id: ID
  ownerId: ID
  name: string
  slug: string
  description?: string
  coverImageUrl?: string
  logoUrl?: string
  address: Address
  coordinates: Coordinates
  phone: string
  cuisineTypes: string[]
  priceRange: PriceRange
  status: RestaurantStatus
  isOpen: boolean
  avgRating: number
  totalReviews: number
  totalOrders: number
  avgPrepTimeMinutes: number
  minOrderAmount: number
  deliveryFee: number
  operatingHours: OperatingHours[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface OperatingHours {
  dayOfWeek: DayOfWeek
  openTime: string // HH:mm
  closeTime: string // HH:mm
  isClosed: boolean
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface MenuCategory {
  id: ID
  restaurantId: ID
  name: string
  description?: string
  imageUrl?: string
  sortOrder: number
  isActive: boolean
  items: MenuItem[]
}

export interface MenuItem {
  id: ID
  categoryId: ID
  restaurantId: ID
  name: string
  description?: string
  imageUrl?: string
  basePrice: number
  currency: string
  isAvailable: boolean
  prepTimeMinutes: number
  calories?: number
  tags: string[]
  dietaryInfo: DietaryInfo
  variants: MenuItemVariant[]
  addons: MenuItemAddon[]
}

export interface MenuItemVariant {
  id: ID
  itemId: ID
  name: string
  priceAdjustment: number
  isDefault: boolean
}

export interface MenuItemAddon {
  id: ID
  itemId: ID
  name: string
  price: number
  maxQuantity: number
  isRequired: boolean
}

export interface DietaryInfo {
  isVegetarian: boolean
  isVegan: boolean
  isGlutenFree: boolean
  isHalal: boolean
  isSpicy: boolean
  spicyLevel?: 1 | 2 | 3
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface Inventory {
  itemId: ID
  restaurantId: ID
  quantity: number
  lowStockThreshold: number
  isTracked: boolean
  updatedAt: Timestamp
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface RestaurantReview {
  id: ID
  restaurantId: ID
  userId: ID
  orderId: ID
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string
  images?: string[]
  ownerReply?: string
  ownerRepliedAt?: Timestamp
  createdAt: Timestamp
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface RestaurantSearchResult extends Restaurant {
  distanceKm: number
  deliveryTimeMinutes: number
  relevanceScore: number
}

export interface RestaurantFilters {
  cuisineTypes?: string[]
  priceRange?: PriceRange[]
  minRating?: number
  maxDeliveryTime?: number
  isOpen?: boolean
  isHalal?: boolean
  isVegetarian?: boolean
  maxDeliveryFee?: number
}
