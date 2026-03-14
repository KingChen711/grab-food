import type { User } from '@grab/types'

import { apiClient } from './client'

// Backend wraps all responses via TransformInterceptor: { success, data, timestamp }
type Wrapped<T> = { data: T }

export const usersApi = {
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<Wrapped<User>>('/users/me')
    return res.data.data
  },
}
