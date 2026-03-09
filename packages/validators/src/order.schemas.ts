import { z } from 'zod'

import { addressSchema, idSchema } from './common.schemas'

// ─── Cart ─────────────────────────────────────────────────────────────────────

export const cartItemSchema = z.object({
  menuItemId: idSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20),
  selectedVariantId: idSchema.optional(),
  selectedAddonIds: z.array(idSchema).max(10).default([]),
  notes: z.string().max(200).optional(),
})

export const addToCartSchema = z.object({
  restaurantId: idSchema,
  item: cartItemSchema,
})

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(20),
  selectedVariantId: idSchema.optional(),
  selectedAddonIds: z.array(idSchema).max(10).optional(),
  notes: z.string().max(200).optional(),
})

export const applyPromotionSchema = z.object({
  code: z.string().min(3, 'Promotion code must be at least 3 characters').max(50).toUpperCase(),
})

// ─── Order ────────────────────────────────────────────────────────────────────

export const createOrderSchema = z
  .object({
    restaurantId: idSchema,
    items: z
      .array(cartItemSchema)
      .min(1, 'At least one item is required')
      .max(30, 'Maximum 30 items per order'),
    deliveryAddressId: idSchema.optional(),
    deliveryAddress: addressSchema.optional(),
    paymentMethod: z.enum(['card', 'wallet', 'cash_on_delivery', 'momo', 'zalopay']),
    paymentMethodId: idSchema.optional(),
    notes: z.string().max(500).optional(),
    promotionCode: z.string().max(50).optional(),
    tip: z.number().min(0).max(500_000).default(0),
    scheduledFor: z.string().datetime().optional(),
  })
  .refine((data) => data.deliveryAddressId ?? data.deliveryAddress, {
    message: 'Either deliveryAddressId or deliveryAddress must be provided',
    path: ['deliveryAddress'],
  })

export const cancelOrderSchema = z.object({
  reason: z.enum([
    'customer_request',
    'wrong_order',
    'too_long_wait',
    'found_better_option',
    'other',
  ]),
  note: z.string().max(500).optional(),
})

export const rateDeliverySchema = z.object({
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  comment: z.string().max(500).optional(),
  tip: z.number().min(0).max(500_000).optional(),
})

// ─── Order Filters ────────────────────────────────────────────────────────────

export const orderHistoryQuerySchema = z.object({
  status: z
    .enum([
      'CREATED',
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'PICKED_UP',
      'DELIVERING',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ])
    .optional(),
  restaurantId: idSchema.optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ─── Driver Order Actions ─────────────────────────────────────────────────────

export const updateDeliveryStatusSchema = z.object({
  status: z.enum([
    'HEADING_TO_RESTAURANT',
    'AT_RESTAURANT',
    'PICKED_UP',
    'HEADING_TO_CUSTOMER',
    'ARRIVED',
    'COMPLETED',
  ]),
  proofPhotoUrl: z.string().url().optional(),
  deliveryOtp: z.string().length(4).optional(),
  note: z.string().max(300).optional(),
})

export const updateDriverLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).default(0),
  speed: z.number().min(0).default(0),
  accuracy: z.number().min(0).optional(),
})

// ─── Restaurant Order Actions ─────────────────────────────────────────────────

export const acceptOrderSchema = z.object({
  estimatedPrepTimeMinutes: z.number().int().min(1).max(120),
})

export const rejectOrderSchema = z.object({
  reason: z.enum([
    'too_busy',
    'item_unavailable',
    'restaurant_closing',
    'technical_issue',
    'other',
  ]),
  note: z.string().max(300).optional(),
})

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
export type RateDeliveryInput = z.infer<typeof rateDeliverySchema>
export type OrderHistoryQuery = z.infer<typeof orderHistoryQuerySchema>
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>
export type UpdateDriverLocationInput = z.infer<typeof updateDriverLocationSchema>
export type AcceptOrderInput = z.infer<typeof acceptOrderSchema>
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>
