'use client'

import { useAuthStore } from '@/stores/auth.store'

import { useLogout, useMe } from './use-auth-query'

export function useAuth() {
  const { user, isAuthenticated } = useAuthStore()
  const { isLoading } = useMe()
  const logout = useLogout()

  return {
    user,
    isAuthenticated,
    isLoading,
    logout: () => logout.mutate(),
  }
}
