'use client'

import type { UserAddress } from '@grab/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { usersApi } from '@/lib/api/users.api'
import type { CreateAddressInput, UpdateAddressInput } from '@/lib/validators/profile.schemas'
import { useAuthStore } from '@/stores/auth.store'

import { queryKeys } from './use-auth-query'

export function useAddresses() {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.addresses,
    queryFn: () => usersApi.getAddresses(),
    enabled: isAuthenticated,
  })
}

export function useCreateAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAddressInput) => usersApi.createAddress(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses })
      toast.success('Address added successfully')
    },
    onError: () => {
      toast.error('Failed to add address')
    },
  })
}

export function useUpdateAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAddressInput }) =>
      usersApi.updateAddress(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses })
      toast.success('Address updated')
    },
    onError: () => {
      toast.error('Failed to update address')
    },
  })
}

export function useDeleteAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => usersApi.deleteAddress(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.addresses })
      const previous = queryClient.getQueryData<UserAddress[]>(queryKeys.addresses)
      queryClient.setQueryData<UserAddress[]>(queryKeys.addresses, (old) =>
        old?.filter((a) => a.id !== id),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKeys.addresses, context?.previous)
      toast.error('Failed to delete address')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses })
    },
  })
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => usersApi.setDefaultAddress(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.addresses })
      const previous = queryClient.getQueryData<UserAddress[]>(queryKeys.addresses)
      queryClient.setQueryData<UserAddress[]>(queryKeys.addresses, (old) =>
        old?.map((a) => ({ ...a, isDefault: a.id === id })),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKeys.addresses, context?.previous)
      toast.error('Failed to set default address')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.addresses })
    },
    onSuccess: () => {
      toast.success('Default address updated')
    },
  })
}
