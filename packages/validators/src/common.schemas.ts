import { z } from 'zod'

// ─── Primitives ───────────────────────────────────────────────────────────────

export const idSchema = z.string().uuid('Invalid ID format')

export const timestampSchema = z.string().datetime({ message: 'Invalid timestamp format' })

export const phoneSchema = z
  .string()
  .regex(/^(\+84|0)[3-9]\d{8}$/, 'Invalid Vietnamese phone number')

export const emailSchema = z.string().email('Invalid email address').toLowerCase()

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const urlSchema = z.string().url('Invalid URL')

// ─── Geolocation ─────────────────────────────────────────────────────────────

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90, 'Invalid latitude'),
  lng: z.number().min(-180).max(180, 'Invalid longitude'),
})

export const addressSchema = z.object({
  label: z.string().max(50).optional(),
  fullAddress: z.string().min(5, 'Address is too short').max(500),
  street: z.string().max(200).optional(),
  district: z.string().max(100).optional(),
  city: z.string().min(1, 'City is required').max(100),
  country: z.string().min(2).max(100).default('Vietnam'),
  coordinates: coordinatesSchema,
})

export const geoQuerySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(0.1).max(50).default(5),
})

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

export const sortOrderSchema = z.enum(['asc', 'desc'])

// ─── File Upload ─────────────────────────────────────────────────────────────

export const fileUploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024), // 10MB max
})
