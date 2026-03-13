import { useQuery } from '@tanstack/react-query'

import { restaurantApi } from '@/lib/api/restaurant.api'

export function useRestaurantBySlug(slug: string) {
  return useQuery({
    queryKey: ['restaurant', 'slug', slug],
    queryFn: () => restaurantApi.getBySlug(slug),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  })
}

export function useRestaurantMenu(restaurantId: string) {
  return useQuery({
    queryKey: ['restaurant', restaurantId, 'menu'],
    queryFn: () => restaurantApi.getMenu(restaurantId),
    staleTime: 5 * 60 * 1000,
    enabled: !!restaurantId,
  })
}

export function useRestaurantReviews(restaurantId: string, page = 1) {
  return useQuery({
    queryKey: ['restaurant', restaurantId, 'reviews', page],
    queryFn: () => restaurantApi.getReviews(restaurantId, { page, limit: 10 }),
    staleTime: 2 * 60 * 1000,
    enabled: !!restaurantId,
  })
}
