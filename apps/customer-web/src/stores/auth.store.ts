import type { AuthTokens, User } from '@grab/types'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setTokens: (tokens: AuthTokens) => void
  setUser: (user: User) => void
  logout: () => void
}

const AUTH_COOKIE = 'grab_auth'

function setAuthCookie(value: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE}=${value}; path=/; samesite=strict`
}

function clearAuthCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

// SSR-safe lazy localStorage
const lazyLocalStorage = createJSONStorage(() =>
  typeof window !== 'undefined' ? window.localStorage : ({} as Storage),
)

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setTokens: (tokens) => {
        setAuthCookie('1')
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        })
      },

      setUser: (user) => set({ user }),

      logout: () => {
        clearAuthCookie()
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'grab-auth',
      storage: lazyLocalStorage,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.isAuthenticated) {
          setAuthCookie('1')
        } else {
          clearAuthCookie()
        }
      },
    },
  ),
)
