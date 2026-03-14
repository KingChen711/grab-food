import type { MenuCategory, OperatingHours, Restaurant } from '@grab/types'

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
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>

export interface CreateMenuItemDto {
  name: string
  description?: string
  basePrice: number
  prepTimeMinutes?: number
  calories?: number
  isAvailable?: boolean
  isVegetarian?: boolean
  isVegan?: boolean
  isGlutenFree?: boolean
  isHalal?: boolean
  isSpicy?: boolean
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
}
