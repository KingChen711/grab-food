import { Injectable, Logger } from '@nestjs/common'

export interface Coordinates {
  lat: number
  lng: number
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name)

  /**
   * Mocks a geocoding API to convert an address string into latitude/longitude.
   * In a real Phase 5 integration, this would call Mapbox/Google Maps.
   */
  public async getCoordinatesFromAddress(address: string): Promise<Coordinates> {
    this.logger.debug(`[Mock Geocode] Resolving address: ${address}`)
    // Return dummy coordinates for District 1, HCMC
    return {
      lat: 10.776889,
      lng: 106.700806,
    }
  }

  /**
   * Mocks a reverse geocoding API.
   */
  public async getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    this.logger.debug(`[Mock Reverse Geocode] Resolving coords: ${lat}, ${lng}`)
    return '123 Fake Street, District 1, Ho Chi Minh City, Vietnam'
  }
}
