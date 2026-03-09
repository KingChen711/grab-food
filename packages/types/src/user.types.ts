import type { Address, ID, Timestamp } from './common.types'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'driver' | 'restaurant_owner' | 'admin'

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification'

export type AuthProvider = 'email' | 'phone' | 'google' | 'facebook' | 'apple'

export type VehicleType = 'motorbike' | 'car' | 'bicycle'

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: ID
  email?: string
  phone?: string
  role: UserRole
  status: UserStatus
  profile: UserProfile
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface UserProfile {
  fullName: string
  avatarUrl?: string
  dateOfBirth?: string
  bio?: string
}

export interface UserAddress extends Address {
  id: ID
  userId: ID
  isDefault: boolean
  createdAt: Timestamp
}

export interface UserDevice {
  id: ID
  userId: ID
  deviceToken: string
  platform: 'ios' | 'android' | 'web'
  lastActiveAt: Timestamp
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface JwtPayload {
  sub: ID
  email?: string
  phone?: string
  role: UserRole
  iat: number
  exp: number
}

export interface OAuthProfile {
  provider: AuthProvider
  providerId: string
  email?: string
  name?: string
  avatarUrl?: string
}

// ─── Driver ──────────────────────────────────────────────────────────────────

export type DriverStatus = 'online' | 'offline' | 'busy' | 'suspended'

export type DriverDocumentType =
  | 'national_id'
  | 'drivers_license'
  | 'vehicle_registration'
  | 'insurance'

export interface Driver {
  id: ID
  userId: ID
  vehicleType: VehicleType
  licensePlate: string
  status: DriverStatus
  currentLocation?: {
    lat: number
    lng: number
    heading?: number
    speed?: number
    updatedAt: Timestamp
  }
  avgRating: number
  totalDeliveries: number
  createdAt: Timestamp
}

export interface DriverDocument {
  id: ID
  driverId: ID
  type: DriverDocumentType
  fileUrl: string
  verified: boolean
  verifiedAt?: Timestamp
}

export interface DriverEarnings {
  driverId: ID
  period: {
    start: Timestamp
    end: Timestamp
  }
  totalOrders: number
  totalDistance: number
  baseFee: number
  tips: number
  bonuses: number
  totalNet: number
}
