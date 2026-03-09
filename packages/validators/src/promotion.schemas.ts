import { z } from 'zod'

import { idSchema } from './common.schemas'

// ─── Promotion ────────────────────────────────────────────────────────────────

export const createPromotionSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, dashes or underscores')
      .toUpperCase(),
    name: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DELIVERY', 'BUY_X_GET_Y']),
    value: z.number().min(0),
    minOrderAmount: z.number().min(0).default(0),
    maxDiscountAmount: z.number().min(0).optional(),
    target: z.enum(['all', 'first_order', 'specific_restaurant', 'specific_user']).default('all'),
    targetRestaurantId: idSchema.optional(),
    usageLimit: z.number().int().min(1).optional(),
    perUserLimit: z.number().int().min(1).max(100).default(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  })
  .refine(
    (data) => (data.type === 'PERCENTAGE' ? data.value > 0 && data.value <= 100 : data.value > 0),
    { message: 'Invalid discount value for the selected type', path: ['value'] },
  )

export const validatePromotionSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  restaurantId: idSchema,
  orderAmount: z.number().min(0),
})

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export const redeemPointsSchema = z.object({
  points: z.number().int().min(100, 'Minimum 100 points to redeem').max(10_000),
})

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>
export type ValidatePromotionInput = z.infer<typeof validatePromotionSchema>
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>
