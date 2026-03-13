import { z } from 'zod'

export const loginEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

export const loginPhoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (E.164 format, e.g. +84901234567)'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export const registerEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase and a number'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
})

export const registerPhoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (E.164 format, e.g. +84901234567)'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase and a number'),
})

export type LoginEmailInput = z.infer<typeof loginEmailSchema>
export type LoginPhoneInput = z.infer<typeof loginPhoneSchema>
export type RegisterEmailInput = z.infer<typeof registerEmailSchema>
export type RegisterPhoneInput = z.infer<typeof registerPhoneSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
