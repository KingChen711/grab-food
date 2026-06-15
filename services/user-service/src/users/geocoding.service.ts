import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface Coordinates {
  lat: number
  lng: number
}

const FALLBACK_COORDS: Coordinates = { lat: 10.776889, lng: 106.700806 }
const MAPBOX_GEOCODE_BASE = 'https://api.mapbox.com/search/geocode/v6'

interface MapboxFeature {
  geometry: { coordinates: [number, number] }
  properties?: { full_address?: string; name?: string }
}

interface MapboxGeocodeResponse {
  features?: MapboxFeature[]
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name)
  private readonly accessToken: string

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('mapbox.accessToken') ?? ''
    if (!this.accessToken) {
      this.logger.warn('MAPBOX_ACCESS_TOKEN is not set — geocoding will use fallback coordinates')
    }
  }

  /**
   * Convert an address string into latitude/longitude using Mapbox Geocoding v6.
   * Falls back to default coordinates on failure or missing token.
   */
  public async getCoordinatesFromAddress(address: string): Promise<Coordinates> {
    if (!this.accessToken) {
      this.logger.debug(`[Fallback Geocode] No token, returning defaults for: ${address}`)
      return FALLBACK_COORDS
    }

    try {
      const url = `${MAPBOX_GEOCODE_BASE}/forward?q=${encodeURIComponent(address)}&access_token=${this.accessToken}&limit=1`
      const response = await fetch(url)

      if (!response.ok) {
        this.logger.warn(`Mapbox forward geocode failed (${response.status}): ${address}`)
        return FALLBACK_COORDS
      }

      const data = (await response.json()) as MapboxGeocodeResponse
      const feature = data.features?.[0]

      if (!feature) {
        this.logger.warn(`Mapbox forward geocode returned no results for: ${address}`)
        return FALLBACK_COORDS
      }

      // Mapbox returns coordinates as [lng, lat]
      const [lng, lat] = feature.geometry.coordinates
      this.logger.debug(`Geocoded "${address}" → [${lat}, ${lng}]`)
      return { lat, lng }
    } catch (error) {
      this.logger.warn(`Mapbox forward geocode error: ${(error as Error).message}`)
      return FALLBACK_COORDS
    }
  }

  /**
   * Convert coordinates into a human-readable address using Mapbox Geocoding v6.
   * Returns empty string on failure.
   */
  public async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    if (!this.accessToken) {
      this.logger.debug(`[Fallback Reverse Geocode] No token for coords: ${lat}, ${lng}`)
      return ''
    }

    try {
      const url = `${MAPBOX_GEOCODE_BASE}/reverse?longitude=${lng}&latitude=${lat}&access_token=${this.accessToken}&limit=1`
      const response = await fetch(url)

      if (!response.ok) {
        this.logger.warn(`Mapbox reverse geocode failed (${response.status}): [${lat}, ${lng}]`)
        return ''
      }

      const data = (await response.json()) as MapboxGeocodeResponse
      const feature = data.features?.[0]

      if (!feature) {
        this.logger.warn(`Mapbox reverse geocode returned no results for: [${lat}, ${lng}]`)
        return ''
      }

      const fullAddress = feature.properties?.full_address ?? feature.properties?.name ?? ''
      this.logger.debug(`Reverse geocoded [${lat}, ${lng}] → "${fullAddress}"`)
      return fullAddress
    } catch (error) {
      this.logger.warn(`Mapbox reverse geocode error: ${(error as Error).message}`)
      return ''
    }
  }
}
