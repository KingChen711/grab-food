'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ordersApi } from '@/lib/api/orders.api'

export const ordersQueryKeys = {
  byRestaurant: (id: string) => ['orders', 'restaurant', id] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
}

/**
 * Live orders feed for the dashboard. Polls every 5 seconds so new orders
 * appear without manual refresh.
 */
export function useRestaurantOrders(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ordersQueryKeys.byRestaurant(restaurantId ?? ''),
    queryFn: () => ordersApi.byRestaurant(restaurantId!),
    enabled: !!restaurantId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ordersQueryKeys.detail(id ?? ''),
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useConfirmOrder(restaurantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, prepMinutes }: { id: string; prepMinutes: number }) =>
      ordersApi.confirm(id, prepMinutes),
    onSuccess: (_, { id }) => {
      if (restaurantId)
        qc.invalidateQueries({ queryKey: ordersQueryKeys.byRestaurant(restaurantId) })
      qc.invalidateQueries({ queryKey: ordersQueryKeys.detail(id) })
    },
  })
}

export function useStartPreparing(restaurantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersApi.startPreparing(id),
    onSuccess: (_, id) => {
      if (restaurantId)
        qc.invalidateQueries({ queryKey: ordersQueryKeys.byRestaurant(restaurantId) })
      qc.invalidateQueries({ queryKey: ordersQueryKeys.detail(id) })
    },
  })
}

export function useMarkReady(restaurantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersApi.markReady(id),
    onSuccess: (_, id) => {
      if (restaurantId)
        qc.invalidateQueries({ queryKey: ordersQueryKeys.byRestaurant(restaurantId) })
      qc.invalidateQueries({ queryKey: ordersQueryKeys.detail(id) })
    },
  })
}

export function useCancelOrder(restaurantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason, note }: { id: string; reason: string; note?: string }) =>
      ordersApi.cancel(id, reason, note),
    onSuccess: (_, { id }) => {
      if (restaurantId)
        qc.invalidateQueries({ queryKey: ordersQueryKeys.byRestaurant(restaurantId) })
      qc.invalidateQueries({ queryKey: ordersQueryKeys.detail(id) })
    },
  })
}
