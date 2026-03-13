import type { User, UserAddress } from '@grab/types'

import { apiClient } from './client'

export interface UpdateProfileInput {
  fullName?: string
  avatarUrl?: string
  dateOfBirth?: string
  bio?: string
}

export interface CreateAddressInput {
  label?: string
  fullAddress: string
  street?: string
  district?: string
  city: string
  country: string
  lat?: number
  lng?: number
  isDefault?: boolean
}

export type UpdateAddressInput = Partial<CreateAddressInput>

export const usersApi = {
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/users/me')
    return res.data
  },

  updateProfile: async (data: UpdateProfileInput): Promise<void> => {
    await apiClient.patch('/users/me', data)
  },

  getAddresses: async (): Promise<UserAddress[]> => {
    const res = await apiClient.get<UserAddress[]>('/users/me/addresses')
    return res.data
  },

  createAddress: async (data: CreateAddressInput): Promise<UserAddress> => {
    const res = await apiClient.post<UserAddress>('/users/me/addresses', data)
    return res.data
  },

  updateAddress: async (id: string, data: UpdateAddressInput): Promise<void> => {
    await apiClient.patch(`/users/me/addresses/${id}`, data)
  },

  deleteAddress: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/me/addresses/${id}`)
  },

  setDefaultAddress: async (id: string): Promise<void> => {
    await apiClient.patch(`/users/me/addresses/${id}/default`)
  },
}
