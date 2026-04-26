import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ordersApi } from '@/lib/api/orders.api'

export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'my'],
    queryFn: () => ordersApi.myOrders(),
    staleTime: 60 * 1000,
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => ordersApi.getById(id),
    staleTime: 30 * 1000,
    refetchInterval: (query) => {
      // Poll active orders for status updates; stop once terminal
      const status = query.state.data?.status
      if (!status) return 5000
      const terminal = ['DELIVERED', 'COMPLETED', 'CANCELLED']
      return terminal.includes(status) ? false : 5000
    },
    enabled: !!id,
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => ordersApi.cancel(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['orders', 'detail', id] })
      qc.invalidateQueries({ queryKey: ['orders', 'my'] })
    },
  })
}
