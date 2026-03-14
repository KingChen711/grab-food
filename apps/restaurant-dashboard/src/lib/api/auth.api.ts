import { apiClient } from './client'

export interface LoginEmailInput {
  email: string
  password: string
  rememberMe?: boolean
}

export const authApi = {
  loginWithEmail: async (data: LoginEmailInput): Promise<void> => {
    await apiClient.post('/auth/login/email', data)
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
}
