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
  loginWithEmail: async (data: LoginEmailInput): Promise<void> => {
    await apiClient.post('/auth/login/email', data)
  },

  loginWithPhone: async (data: LoginPhoneInput): Promise<void> => {
    await apiClient.post('/auth/login/phone', data)
  },

  registerWithEmail: async (data: RegisterEmailInput): Promise<void> => {
    await apiClient.post('/auth/register/email', data)
  },

  registerWithPhone: async (data: RegisterPhoneInput): Promise<void> => {
    await apiClient.post('/auth/register/phone', data)
  },

  loginWithGoogle: async (accessToken: string): Promise<void> => {
    await apiClient.post('/auth/google/verify', { accessToken })
  },

  forgotPassword: async (data: ForgotPasswordInput): Promise<void> => {
    await apiClient.post('/auth/forgot-password', data)
  },

  resetPassword: async (data: ResetPasswordInput): Promise<void> => {
    await apiClient.post('/auth/reset-password', data)
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
}
