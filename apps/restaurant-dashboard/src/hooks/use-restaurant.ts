'use client'

import { useQuery } from '@tanstack/react-query'

import { restaurantApi } from '@/lib/api/restaurant.api'

export const restaurantQueryKeys = {
  myRestaurants: ['restaurants', 'owner', 'me'] as const,
  menu: (id: string) => ['restaurants', id, 'menu'] as const,
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
