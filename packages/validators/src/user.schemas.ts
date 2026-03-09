import { z } from 'zod'

import { addressSchema, emailSchema, passwordSchema, phoneSchema } from './common.schemas'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const registerWithEmailSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    phone: phoneSchema.optional(),
    agreeToTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the terms and conditions' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const registerWithPhoneSchema = z.object({
  phone: phoneSchema,
  fullName: z.string().min(2).max(100),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms and conditions' }),
  }),
})

export const loginWithEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
})

export const loginWithPhoneSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export const sendOtpSchema = z.object({
  phone: phoneSchema,
})

// ─── Profile ─────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  dateOfBirth: z
    .string()
    .date('Invalid date format')
    .refine((date) => new Date(date) < new Date(), 'Date of birth must be in the past')
    .optional(),
  bio: z.string().max(500).optional(),
})

// ─── Address ─────────────────────────────────────────────────────────────────

export const createAddressSchema = addressSchema.extend({
  isDefault: z.boolean().default(false),
})

export const updateAddressSchema = createAddressSchema.partial()

// ─── Driver Registration ─────────────────────────────────────────────────────

export const driverRegistrationSchema = z.object({
  vehicleType: z.enum(['motorbike', 'car', 'bicycle']),
  licensePlate: z
    .string()
    .regex(/^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/, 'Invalid license plate format')
    .or(z.string().min(4).max(20)),
  identityNumber: z.string().length(12, 'Identity number must be 12 digits'),
})

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type RegisterWithEmailInput = z.infer<typeof registerWithEmailSchema>
export type RegisterWithPhoneInput = z.infer<typeof registerWithPhoneSchema>
export type LoginWithEmailInput = z.infer<typeof loginWithEmailSchema>
export type LoginWithPhoneInput = z.infer<typeof loginWithPhoneSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateAddressInput = z.infer<typeof createAddressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
export type DriverRegistrationInput = z.infer<typeof driverRegistrationSchema>
