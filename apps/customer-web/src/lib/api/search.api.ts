import { apiClient } from './client'

export interface RestaurantResult {
  id: string
  name: string
  slug: string
  description: string | null
  cuisineTypes: string[]
  priceRange: number
  avgRating: number
  totalOrders: number
  avgPrepTimeMinutes: number
  minOrderAmount: number
  deliveryFee: number
  isOpen: boolean
  city: string
  coverImageUrl: string | null
  logoUrl: string | null
}

export interface SearchRestaurantsParams {
  q?: string
  lat?: number
  lng?: number
  radius?: number
  cuisine?: string[]
  priceRange?: number
  minRating?: number
  maxPrepTime?: number
  isOpen?: boolean
  sort?: 'relevance' | 'distance' | 'rating' | 'popularity'
  page?: number
  limit?: number
}

export interface SearchRestaurantsResponse {
  data: RestaurantResult[]
  total: number
  page: number
  limit: number
  facets: {
    cuisines: { key: string; doc_count: number }[]
    priceRanges: { key: number; doc_count: number }[]
  }
}

export const searchApi = {
  restaurants: (params: SearchRestaurantsParams): Promise<SearchRestaurantsResponse> =>
    apiClient
      .get('/search/restaurants', { params })
      .then((r) => r.data as SearchRestaurantsResponse),
}
