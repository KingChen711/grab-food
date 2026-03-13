'use client'

import { useAuthStore } from '@/stores/auth.store'

import { useLogout, useMe } from './use-auth-query'

export function useAuth() {
  const { user, isAuthenticated, accessToken } = useAuthStore()
  const { isLoading } = useMe()
  const logout = useLogout()

  return {
    user,
    isAuthenticated,
    accessToken,
    isLoading,
    logout: () => logout.mutate(),
  }
}
