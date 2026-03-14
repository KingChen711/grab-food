import type { User } from '@grab/types'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuthenticated: () => void
  setUser: (user: User) => void
  logout: () => void
}

// SSR-safe lazy localStorage
const lazyLocalStorage = createJSONStorage(() =>
  typeof window !== 'undefined' ? window.localStorage : ({} as Storage),
)

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setAuthenticated: () => set({ isAuthenticated: true }),

      setUser: (user) => set({ user }),

      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'grab-restaurant-auth',
      storage: lazyLocalStorage,
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
