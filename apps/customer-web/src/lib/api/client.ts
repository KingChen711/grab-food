import axios from 'axios'

import { useAuthStore } from '@/stores/auth.store'

// Client-side requests go through Next.js Route Handlers (/api/*)
// which proxy to the actual backend — keeping BACKEND_URL server-side only.
export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Refresh queue logic ──────────────────────────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown) {
  for (const prom of failedQueue) {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  }
  failedQueue = []
}

// ─── Response interceptor: handle 401 with token refresh ─────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // Don't retry if not authenticated — no token to refresh (e.g. wrong password on login page)
    if (!useAuthStore.getState().isAuthenticated) {
      return Promise.reject(error)
    }

    // Don't retry the refresh endpoint itself or already-retried requests
    if (originalRequest.url === '/auth/refresh' || originalRequest._retry) {
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    // Queue concurrent requests while refreshing
    if (isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => apiClient(originalRequest))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      // Route handler reads refresh_token cookie and sets new cookies
      await apiClient.post('/auth/refresh')
      processQueue(null)
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError)
      useAuthStore.getState().logout()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
