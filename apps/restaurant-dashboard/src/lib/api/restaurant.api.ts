import type {
  Inventory,
  MenuCategory,
  MenuItemAddon,
  MenuItemVariant,
  OperatingHours,
  Restaurant,
} from '@grab/types'

import { apiClient } from './client'

// Backend wraps all responses via TransformInterceptor: { success, data, timestamp }
type Wrapped<T> = { data: T }

export interface UpdateRestaurantDto {
  name?: string
  description?: string
  phone?: string
  cuisineTypes?: string[]
  priceRange?: number
  minOrderAmount?: number
  deliveryFee?: number
}

export interface CreateCategoryDto {
  name: string
  description?: string
  imageUrl?: string
  sortOrder?: number
  isActive?: boolean
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>

export interface VariantDto {
  name: string
  priceAdjustment?: number
  isDefault?: boolean
}

export interface AddonDto {
  name: string
  price?: number
  maxQuantity?: number
  isRequired?: boolean
}

export interface CreateMenuItemDto {
  name: string
  description?: string
  imageUrl?: string
  basePrice: number
  currency?: string
  prepTimeMinutes?: number
  calories?: number
  isAvailable?: boolean
  isVegetarian?: boolean
  isVegan?: boolean
  isGlutenFree?: boolean
  isHalal?: boolean
  isSpicy?: boolean
  spicyLevel?: 1 | 2 | 3
  tags?: string[]
  variants?: VariantDto[]
  addons?: AddonDto[]
}

export type UpdateMenuItemDto = Partial<CreateMenuItemDto>

export const restaurantApi = {
  getMyRestaurants: async (): Promise<Restaurant[]> => {
    const res = await apiClient.get<Wrapped<Restaurant[]>>('/restaurants/owner/me')
    return res.data.data
  },

  update: async (id: string, dto: UpdateRestaurantDto): Promise<Restaurant> => {
    const res = await apiClient.patch<Wrapped<Restaurant>>(`/restaurants/${id}`, dto)
    return res.data.data
  },

  toggleOpen: async (id: string): Promise<Restaurant> => {
    const res = await apiClient.patch<Wrapped<Restaurant>>(`/restaurants/${id}/open`)
    return res.data.data
  },

  getMenu: async (restaurantId: string): Promise<MenuCategory[]> => {
    const res = await apiClient.get<Wrapped<MenuCategory[]>>(`/restaurants/${restaurantId}/menu`)
    return res.data.data
  },

  /** Returns ALL categories (including inactive) — for management view */
  getCategories: async (restaurantId: string): Promise<MenuCategory[]> => {
    const res = await apiClient.get<Wrapped<MenuCategory[]>>(
      `/restaurants/${restaurantId}/categories`,
    )
    return res.data.data
  },

  updateCoverImage: async (id: string, url: string): Promise<Restaurant> => {
    const res = await apiClient.patch<Wrapped<Restaurant>>(`/restaurants/${id}/cover-image`, {
      url,
    })
    return res.data.data
  },

  updateLogo: async (id: string, url: string): Promise<Restaurant> => {
    const res = await apiClient.patch<Wrapped<Restaurant>>(`/restaurants/${id}/logo`, { url })
    return res.data.data
  },

  updateAllHours: async (id: string, hours: OperatingHours[]): Promise<void> => {
    await apiClient.put(`/restaurants/${id}/hours`, { hours })
  },

  // ─── Categories ──────────────────────────────────────────────────────────────
  createCategory: async (restaurantId: string, dto: CreateCategoryDto): Promise<MenuCategory> => {
    const res = await apiClient.post<Wrapped<MenuCategory>>(
      `/restaurants/${restaurantId}/categories`,
      dto,
    )
    return res.data.data
  },

  updateCategory: async (
    restaurantId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<MenuCategory> => {
    const res = await apiClient.patch<Wrapped<MenuCategory>>(
      `/restaurants/${restaurantId}/categories/${categoryId}`,
      dto,
    )
    return res.data.data
  },

  deleteCategory: async (restaurantId: string, categoryId: string): Promise<void> => {
    await apiClient.delete(`/restaurants/${restaurantId}/categories/${categoryId}`)
  },

  // ─── Items ───────────────────────────────────────────────────────────────────
  createItem: async (
    restaurantId: string,
    categoryId: string,
    dto: CreateMenuItemDto,
  ): Promise<void> => {
    await apiClient.post(`/restaurants/${restaurantId}/categories/${categoryId}/items`, dto)
  },

  updateItem: async (
    restaurantId: string,
    itemId: string,
    dto: UpdateMenuItemDto,
  ): Promise<void> => {
    await apiClient.patch(`/restaurants/${restaurantId}/items/${itemId}`, dto)
  },

  deleteItem: async (restaurantId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/restaurants/${restaurantId}/items/${itemId}`)
  },

  // ─── Variants ────────────────────────────────────────────────────────────────
  addVariant: async (
    restaurantId: string,
    itemId: string,
    dto: VariantDto,
  ): Promise<MenuItemVariant> => {
    const res = await apiClient.post<Wrapped<MenuItemVariant>>(
      `/restaurants/${restaurantId}/items/${itemId}/variants`,
      dto,
    )
    return res.data.data
  },

  updateVariant: async (
    restaurantId: string,
    itemId: string,
    variantId: string,
    dto: Partial<VariantDto>,
  ): Promise<void> => {
    await apiClient.patch(`/restaurants/${restaurantId}/items/${itemId}/variants/${variantId}`, dto)
  },

  deleteVariant: async (restaurantId: string, itemId: string, variantId: string): Promise<void> => {
    await apiClient.delete(`/restaurants/${restaurantId}/items/${itemId}/variants/${variantId}`)
  },

  // ─── Addons ──────────────────────────────────────────────────────────────────
  addAddon: async (restaurantId: string, itemId: string, dto: AddonDto): Promise<MenuItemAddon> => {
    const res = await apiClient.post<Wrapped<MenuItemAddon>>(
      `/restaurants/${restaurantId}/items/${itemId}/addons`,
      dto,
    )
    return res.data.data
  },

  updateAddon: async (
    restaurantId: string,
    itemId: string,
    addonId: string,
    dto: Partial<AddonDto>,
  ): Promise<void> => {
    await apiClient.patch(`/restaurants/${restaurantId}/items/${itemId}/addons/${addonId}`, dto)
  },

  deleteAddon: async (restaurantId: string, itemId: string, addonId: string): Promise<void> => {
    await apiClient.delete(`/restaurants/${restaurantId}/items/${itemId}/addons/${addonId}`)
  },

  // ─── Inventory ───────────────────────────────────────────────────────────────
  getInventory: async (restaurantId: string): Promise<Inventory[]> => {
    const res = await apiClient.get<Wrapped<Inventory[]>>(`/restaurants/${restaurantId}/inventory`)
    return res.data.data
  },

  upsertInventory: async (
    restaurantId: string,
    itemId: string,
    dto: { quantity: number; lowStockThreshold?: number; isTracked?: boolean },
  ): Promise<Inventory> => {
    const res = await apiClient.put<Wrapped<Inventory>>(
      `/restaurants/${restaurantId}/inventory/${itemId}`,
      dto,
    )
    return res.data.data
  },
}
