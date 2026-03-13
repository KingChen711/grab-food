'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { authApi } from '@/lib/api/auth.api'
import { usersApi } from '@/lib/api/users.api'
import type {
  ForgotPasswordInput,
  LoginEmailInput,
  LoginPhoneInput,
  RegisterEmailInput,
  RegisterPhoneInput,
  ResetPasswordInput,
} from '@/lib/validators/auth.schemas'
import { useAuthStore } from '@/stores/auth.store'

export const queryKeys = {
  me: ['users', 'me'] as const,
  addresses: ['users', 'me', 'addresses'] as const,
}

export function useMe() {
  const { isAuthenticated } = useAuthStore()
  const setUser = useAuthStore((s) => s.setUser)

  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const user = await usersApi.getMe()
      setUser(user)
      return user
    },
    enabled: isAuthenticated,
  })
}

/**
 * Shared post-login logic: mark authenticated, prefetch user, navigate.
 * Tokens are stored in httpOnly cookies — never handled client-side.
 */
function usePostLogin() {
  const { setAuthenticated, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return async () => {
    setAuthenticated()
    const user = await queryClient.fetchQuery({
      queryKey: queryKeys.me,
      queryFn: () => usersApi.getMe(),
    })
    setUser(user)
    router.push('/')
  }
}

export function useLoginEmail() {
  const postLogin = usePostLogin()

  return useMutation({
    mutationFn: (data: LoginEmailInput) => authApi.loginWithEmail(data),
    onSuccess: postLogin,
    onError: () => {
      toast.error('Invalid email or password')
    },
  })
}

export function useLoginPhone() {
  const postLogin = usePostLogin()

  return useMutation({
    mutationFn: (data: LoginPhoneInput) =>
      authApi.loginWithPhone({ phone: data.phone, otp: data.otp }),
    onSuccess: postLogin,
    onError: () => {
      toast.error('Invalid phone number or OTP')
    },
  })
}

export function useRegisterEmail() {
  const postLogin = usePostLogin()

  return useMutation({
    mutationFn: (data: RegisterEmailInput) =>
      authApi.registerWithEmail({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone || undefined,
      }),
    onSuccess: async () => {
      toast.success('Account created successfully!')
      await postLogin()
    },
    onError: (err: { response?: { status?: number } }) => {
      if (err.response?.status === 409) {
        toast.error('Email is already registered')
      } else {
        toast.error('Registration failed. Please try again.')
      }
    },
  })
}

export function useRegisterPhone() {
  const postLogin = usePostLogin()

  return useMutation({
    mutationFn: (data: RegisterPhoneInput) =>
      authApi.registerWithPhone({ phone: data.phone, fullName: data.fullName, otp: data.otp }),
    onSuccess: async () => {
      toast.success('Account created successfully!')
      await postLogin()
    },
    onError: (err: { response?: { status?: number } }) => {
      if (err.response?.status === 409) {
        toast.error('Phone number is already registered')
      } else {
        toast.error('Registration failed. Please try again.')
      }
    },
  })
}

export function useGoogleLogin() {
  const postLogin = usePostLogin()

  return useMutation({
    mutationFn: (idToken: string) => authApi.loginWithGoogle(idToken),
    onSuccess: postLogin,
    onError: () => {
      toast.error('Google sign-in failed. Please try again.')
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout()
      queryClient.clear()
      router.push('/login')
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: ForgotPasswordInput) => authApi.forgotPassword(data),
    onSuccess: () => {
      toast.success('If that email exists, a reset OTP has been sent.')
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.')
    },
  })
}

export function useResetPassword() {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: ResetPasswordInput) => authApi.resetPassword(data),
    onSuccess: () => {
      toast.success('Password reset successfully!')
      router.push('/login')
    },
    onError: () => {
      toast.error('Invalid or expired OTP. Please try again.')
    },
  })
}
