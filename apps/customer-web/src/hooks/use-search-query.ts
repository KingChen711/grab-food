import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { searchApi, type SearchRestaurantsParams } from '@/lib/api/search.api'

export function usePopularRestaurants(limit = 8) {
  return useQuery({
    queryKey: ['restaurants', 'popular', limit],
    queryFn: () => searchApi.restaurants({ sort: 'popularity', limit }),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSearchRestaurants(params: SearchRestaurantsParams, enabled = true) {
  return useQuery({
    queryKey: ['restaurants', 'search', params],
    queryFn: () => searchApi.restaurants(params),
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useInfiniteSearchRestaurants(
  params: Omit<SearchRestaurantsParams, 'page'>,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ['restaurants', 'infinite', params],
    queryFn: ({ pageParam }) =>
      searchApi.restaurants({ ...params, page: pageParam as number, limit: 12 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.limit
      return loaded < lastPage.total ? lastPage.page + 1 : undefined
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  })
}
