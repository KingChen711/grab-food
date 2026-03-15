'use client'

import { useQuery } from '@tanstack/react-query'

import { restaurantApi } from '@/lib/api/restaurant.api'

export const restaurantQueryKeys = {
  myRestaurants: ['restaurants', 'owner', 'me'] as const,
  menu: (id: string) => ['restaurants', id, 'menu'] as const,
  categories: (id: string) => ['restaurants', id, 'categories'] as const,
  inventory: (id: string) => ['restaurants', id, 'inventory'] as const,
}

export function useMyRestaurant() {
  const query = useQuery({
    queryKey: restaurantQueryKeys.myRestaurants,
    queryFn: () => restaurantApi.getMyRestaurants(),
  })

  return {
    ...query,
    restaurant: query.data?.[0] ?? null,
  }
}

export function useRestaurantMenu(restaurantId: string | undefined) {
  return useQuery({
    queryKey: restaurantQueryKeys.menu(restaurantId ?? ''),
    queryFn: () => restaurantApi.getMenu(restaurantId!),
    enabled: !!restaurantId,
  })
}

/** Returns ALL categories including inactive — for management UI */
export function useRestaurantCategories(restaurantId: string | undefined) {
  return useQuery({
    queryKey: restaurantQueryKeys.categories(restaurantId ?? ''),
    queryFn: () => restaurantApi.getCategories(restaurantId!),
    enabled: !!restaurantId,
  })
}

export function useRestaurantInventory(restaurantId: string | undefined) {
  return useQuery({
    queryKey: restaurantQueryKeys.inventory(restaurantId ?? ''),
    queryFn: () => restaurantApi.getInventory(restaurantId!),
    enabled: !!restaurantId,
  })
}
