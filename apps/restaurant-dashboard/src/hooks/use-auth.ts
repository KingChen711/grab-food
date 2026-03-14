'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { authApi } from '@/lib/api/auth.api'
import { usersApi } from '@/lib/api/users.api'
import { useAuthStore } from '@/stores/auth.store'

export const authQueryKeys = {
  me: ['users', 'me'] as const,
}

export function useMe() {
  const { isAuthenticated } = useAuthStore()
  const setUser = useAuthStore((s) => s.setUser)

  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: async () => {
      const user = await usersApi.getMe()
      setUser(user)
      return user
    },
    enabled: isAuthenticated,
  })
}

export function useAuth() {
  const { user, isAuthenticated } = useAuthStore()
  const { isLoading } = useMe()
  const queryClient = useQueryClient()
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout()
      queryClient.clear()
      router.push('/login')
    },
  })

  return {
    user,
    isAuthenticated,
    isLoading,
    logout: () => logoutMutation.mutate(),
  }
}
