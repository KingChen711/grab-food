import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { type AddItemInput, cartApi, type CheckoutInput } from '@/lib/api/cart.api'

const cartKey = ['cart'] as const

export function useCart() {
  return useQuery({
    queryKey: cartKey,
    queryFn: () => cartApi.get(),
    staleTime: 30 * 1000,
  })
}

export function useAddToCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddItemInput) => cartApi.addItem(input),
    onSuccess: (cart) => {
      qc.setQueryData(cartKey, cart)
    },
  })
}

export function useUpdateCartQuantity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
      cartApi.updateQuantity(cartItemId, quantity),
    onSuccess: (cart) => qc.setQueryData(cartKey, cart),
  })
}

export function useRemoveFromCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cartItemId: string) => cartApi.removeItem(cartItemId),
    onSuccess: (cart) => qc.setQueryData(cartKey, cart),
  })
}

export function useClearCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: () => qc.setQueryData(cartKey, null),
  })
}

export function useApplyPromo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => cartApi.applyPromo(code),
    onSuccess: (cart) => qc.setQueryData(cartKey, cart),
  })
}

export function useRemovePromo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => cartApi.removePromo(),
    onSuccess: (cart) => qc.setQueryData(cartKey, cart),
  })
}

export function useReorder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => cartApi.reorder(orderId),
    onSuccess: (cart) => qc.setQueryData(cartKey, cart),
  })
}

export function useCheckout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CheckoutInput) => cartApi.checkout(input),
    onSuccess: () => {
      // Cart is cleared server-side after a successful checkout
      qc.setQueryData(cartKey, null)
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
