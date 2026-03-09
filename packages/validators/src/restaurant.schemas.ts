import { z } from 'zod'

import { addressSchema, coordinatesSchema, idSchema } from './common.schemas'

// ─── Operating Hours ─────────────────────────────────────────────────────────

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

export const operatingHoursSchema = z.object({
  dayOfWeek: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
  openTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
  closeTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
  isClosed: z.boolean().default(false),
})

// ─── Restaurant ───────────────────────────────────────────────────────────────

export const createRestaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional(),
  phone: z.string().min(10).max(15),
  cuisineTypes: z
    .array(z.string().min(2).max(50))
    .min(1, 'At least one cuisine type is required')
    .max(5, 'Maximum 5 cuisine types allowed'),
  priceRange: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  address: addressSchema,
  coordinates: coordinatesSchema,
  minOrderAmount: z.number().min(0).default(0),
  deliveryFee: z.number().min(0).default(0),
  operatingHours: z.array(operatingHoursSchema).length(7, 'Must provide hours for all 7 days'),
})

export const updateRestaurantSchema = createRestaurantSchema.partial()

// ─── Menu Category ────────────────────────────────────────────────────────────

export const createMenuCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
})

export const updateMenuCategorySchema = createMenuCategorySchema.partial()

// ─── Menu Item ───────────────────────────────────────────────────────────────

export const dietaryInfoSchema = z.object({
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  isHalal: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  spicyLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
})

export const menuItemVariantSchema = z.object({
  name: z.string().min(1).max(100),
  priceAdjustment: z.number(),
  isDefault: z.boolean().default(false),
})

export const menuItemAddonSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  maxQuantity: z.number().int().min(1).max(10).default(1),
  isRequired: z.boolean().default(false),
})

export const createMenuItemSchema = z.object({
  categoryId: idSchema,
  name: z.string().min(1, 'Item name is required').max(200),
  description: z.string().max(1000).optional(),
  basePrice: z.number().min(0, 'Price must be non-negative'),
  prepTimeMinutes: z.number().int().min(1).max(120).default(15),
  calories: z.number().int().min(0).optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  dietaryInfo: dietaryInfoSchema.default({}),
  variants: z.array(menuItemVariantSchema).max(10).default([]),
  addons: z.array(menuItemAddonSchema).max(20).default([]),
})

export const updateMenuItemSchema = createMenuItemSchema.partial().omit({ categoryId: true })

export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isTracked: z.boolean().default(true),
})

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  orderId: idSchema,
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  comment: z.string().min(10, 'Review must be at least 10 characters').max(1000).optional(),
})

export const replyToReviewSchema = z.object({
  reply: z.string().min(5, 'Reply must be at least 5 characters').max(500),
})

// ─── Search ──────────────────────────────────────────────────────────────────

export const restaurantSearchSchema = z.object({
  query: z.string().max(200).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(30).default(5),
  cuisineTypes: z.array(z.string()).optional(),
  priceRange: z.array(z.coerce.number().int().min(1).max(4)).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxDeliveryTime: z.coerce.number().int().min(1).optional(),
  isOpen: z.coerce.boolean().optional(),
  isHalal: z.coerce.boolean().optional(),
  isVegetarian: z.coerce.boolean().optional(),
  sortBy: z.enum(['distance', 'rating', 'delivery_time', 'popularity']).default('distance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>
export type CreateMenuCategoryInput = z.infer<typeof createMenuCategorySchema>
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>
export type CreateReviewInput = z.infer<typeof createReviewSchema>
export type RestaurantSearchInput = z.infer<typeof restaurantSearchSchema>
