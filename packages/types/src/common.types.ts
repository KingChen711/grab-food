// ─── Primitive Helpers ────────────────────────────────────────────────────────

export type ID = string
export type Timestamp = string // ISO 8601
export type Currency = 'VND' | 'USD'
export type Locale = 'vi' | 'en'

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number
  limit?: number
  cursor?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    nextCursor?: string
  }
}

// ─── Geolocation ─────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number
  lng: number
}

export interface Address {
  label?: string
  fullAddress: string
  street?: string
  district?: string
  city: string
  country: string
  coordinates: Coordinates
}

export interface GeoQuery {
  lat: number
  lng: number
  radiusKm?: number
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
  timestamp: Timestamp
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: Timestamp
}

// ─── Sort & Filter ────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc'

export interface SortQuery {
  field: string
  order: SortOrder
}

// ─── File Upload ──────────────────────────────────────────────────────────────

export interface UploadedFile {
  url: string
  key: string
  size: number
  mimeType: string
  originalName: string
}

export interface PresignedUploadUrl {
  uploadUrl: string
  key: string
  expiresAt: Timestamp
}

// ─── Event Base ──────────────────────────────────────────────────────────────

export interface DomainEvent<T = unknown> {
  eventId: string
  eventType: string
  aggregateId: string
  aggregateType: string
  version: number
  data: T
  metadata: EventMetadata
  occurredAt: Timestamp
}

export interface EventMetadata {
  correlationId: string
  causationId?: string
  userId?: string
  ipAddress?: string
}
