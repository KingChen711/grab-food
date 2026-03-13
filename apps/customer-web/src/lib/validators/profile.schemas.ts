import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  dateOfBirth: z.string().optional(),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
})

export const createAddressSchema = z.object({
  label: z.string().max(50).optional(),
  fullAddress: z.string().min(5, 'Address is required'),
  street: z.string().optional(),
  district: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
})

export const updateAddressSchema = createAddressSchema.partial()

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateAddressInput = z.infer<typeof createAddressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
