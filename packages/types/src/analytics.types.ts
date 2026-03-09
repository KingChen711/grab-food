import type { ID, Timestamp } from './common.types'

// ─── Platform Analytics ───────────────────────────────────────────────────────

export interface PlatformKPIs {
  period: DateRange
  gmv: number
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  avgOrderValue: number
  activeCustomers: number
  newCustomers: number
  activeRestaurants: number
  activeDrivers: number
  avgDeliveryTimeMinutes: number
}

export interface DateRange {
  start: Timestamp
  end: Timestamp
}

// ─── Restaurant Analytics ────────────────────────────────────────────────────

export interface RestaurantAnalytics {
  restaurantId: ID
  period: DateRange
  revenue: number
  totalOrders: number
  avgOrderValue: number
  popularItems: PopularItem[]
  peakHours: HourlyMetric[]
  dailyRevenue: DailyMetric[]
  avgRating: number
  newCustomers: number
  repeatCustomers: number
}

export interface PopularItem {
  menuItemId: ID
  name: string
  totalOrdered: number
  revenue: number
  imageUrl?: string
}

export interface HourlyMetric {
  hour: number
  value: number
}

export interface DailyMetric {
  date: string
  value: number
}

// ─── Driver Analytics ────────────────────────────────────────────────────────

export interface DriverAnalytics {
  driverId: ID
  period: DateRange
  totalDeliveries: number
  totalDistance: number
  totalEarnings: number
  avgDeliveryTime: number
  avgRating: number
  acceptanceRate: number
  completionRate: number
  onlineHours: number
}

// ─── Funnel Analytics ────────────────────────────────────────────────────────

export interface FunnelStep {
  step: string
  count: number
  conversionRate: number
  dropOffRate: number
}

export interface OrderFunnel {
  period: DateRange
  steps: FunnelStep[]
  overallConversionRate: number
}
