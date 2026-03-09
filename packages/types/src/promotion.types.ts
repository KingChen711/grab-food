import type { ID, Timestamp } from './common.types'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type PromotionType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY' | 'BUY_X_GET_Y'

export type PromotionTarget = 'all' | 'first_order' | 'specific_restaurant' | 'specific_user'

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

// ─── Promotion ────────────────────────────────────────────────────────────────

export interface Promotion {
  id: ID
  code: string
  name: string
  description?: string
  type: PromotionType
  value: number
  minOrderAmount: number
  maxDiscountAmount?: number
  target: PromotionTarget
  targetRestaurantId?: ID
  usageLimit?: number
  usedCount: number
  perUserLimit: number
  startDate: Timestamp
  endDate: Timestamp
  isActive: boolean
  createdAt: Timestamp
}

export interface PromotionValidationResult {
  isValid: boolean
  discount: number
  errorCode?:
    | 'EXPIRED'
    | 'USAGE_LIMIT_REACHED'
    | 'MIN_ORDER_NOT_MET'
    | 'NOT_APPLICABLE'
    | 'ALREADY_USED'
  errorMessage?: string
}

// ─── Loyalty ─────────────────────────────────────────────────────────────────

export interface LoyaltyAccount {
  userId: ID
  points: number
  tier: LoyaltyTier
  pointsToNextTier: number
  updatedAt: Timestamp
}

export interface LoyaltyTransaction {
  id: ID
  userId: ID
  points: number
  type: 'earned' | 'redeemed' | 'expired' | 'bonus'
  referenceId?: ID
  referenceType?: 'order' | 'referral' | 'promotion'
  description: string
  createdAt: Timestamp
}

export const LOYALTY_TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  PLATINUM: 15000,
}

// ─── Referral ────────────────────────────────────────────────────────────────

export interface Referral {
  id: ID
  referrerId: ID
  refereeId?: ID
  code: string
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED'
  referrerReward: number
  refereeReward: number
  completedAt?: Timestamp
  createdAt: Timestamp
}
