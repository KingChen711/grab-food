import { Injectable, Logger } from '@nestjs/common'

import { MENU_ITEMS_INDEX, RESTAURANTS_INDEX, SearchService } from '../search/search.service'

export interface RestaurantDocument {
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
  status: string
  lat: number
  lng: number
  city: string
  fullAddress: string
  coverImageUrl: string | null
  logoUrl: string | null
  updatedAt: string
}

export interface MenuItemDocument {
  id: string
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  name: string
  description: string | null
  basePrice: number
  currency: string
  isAvailable: boolean
  tags: string[]
  isVegetarian: boolean
  isVegan: boolean
  isGlutenFree: boolean
  isHalal: boolean
  imageUrl: string | null
}

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name)

  constructor(private readonly searchService: SearchService) {}

  public async upsertRestaurant(doc: RestaurantDocument): Promise<void> {
    const { lat, lng, ...rest } = doc
    await this.searchService.client.index({
      index: RESTAURANTS_INDEX,
      id: doc.id,
      document: {
        ...rest,
        location: { lat, lon: lng },
      },
    })
    this.logger.debug(`Indexed restaurant ${doc.id} (${doc.name})`)
  }

  public async deleteRestaurant(id: string): Promise<void> {
    await this.searchService.client.delete({ index: RESTAURANTS_INDEX, id }).catch(() => {
      // ignore 404 — not in index yet
    })
    this.logger.debug(`Removed restaurant ${id} from index`)
  }

  public async upsertMenuItem(doc: MenuItemDocument): Promise<void> {
    await this.searchService.client.index({
      index: MENU_ITEMS_INDEX,
      id: doc.id,
      document: doc,
    })
    this.logger.debug(`Indexed menu item ${doc.id} (${doc.name})`)
  }

  public async deleteMenuItem(id: string): Promise<void> {
    await this.searchService.client.delete({ index: MENU_ITEMS_INDEX, id }).catch(() => {})
    this.logger.debug(`Removed menu item ${id} from index`)
  }

  /** Remove all menu items belonging to a restaurant (e.g. on restaurant delete) */
  public async deleteMenuItemsByRestaurant(restaurantId: string): Promise<void> {
    await this.searchService.client.deleteByQuery({
      index: MENU_ITEMS_INDEX,
      query: { term: { restaurantId } },
    })
  }
}
