import type { AuthTokens } from '@grab/types'

import { apiClient } from './client'

export interface LoginEmailInput {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginPhoneInput {
  phone: string
  otp: string
}

export interface RegisterEmailInput {
  email: string
  password: string
  fullName: string
  phone?: string
}

export interface RegisterPhoneInput {
  phone: string
  fullName: string
  otp: string
  role?: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  email: string
  otp: string
  newPassword: string
}

export const authApi = {
  loginWithEmail: async (data: LoginEmailInput): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>('/auth/login/email', data)
    return res.data
  },

  loginWithPhone: async (data: LoginPhoneInput): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>('/auth/login/phone', data)
    return res.data
  },

  registerWithEmail: async (data: RegisterEmailInput): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>('/auth/register/email', data)
    return res.data
  },

  registerWithPhone: async (data: RegisterPhoneInput): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>('/auth/register/phone', data)
    return res.data
  },

  loginWithGoogle: async (idToken: string): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>('/auth/google/verify', { idToken })
    return res.data
  },

  forgotPassword: async (data: ForgotPasswordInput): Promise<void> => {
    await apiClient.post('/auth/forgot-password', data)
  },

  resetPassword: async (data: ResetPasswordInput): Promise<void> => {
    await apiClient.post('/auth/reset-password', data)
  },

  logout: async (refreshToken?: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken })
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const res = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken })
    return res.data
  },
}
