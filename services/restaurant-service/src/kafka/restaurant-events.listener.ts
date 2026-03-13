import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import type { MenuItem } from '../menu/entities/menu-item.entity'
import { MenuService } from '../menu/menu.service'
import type { Restaurant } from '../restaurants/entities/restaurant.entity'
import { RestaurantsService } from '../restaurants/restaurants.service'
import { KafkaProducerService } from './kafka-producer.service'

const RESTAURANT_EVENTS_TOPIC = 'restaurant.events'
const SEARCH_INDEXING_TOPIC = 'search.indexing'

function toRestaurantPayload(r: Restaurant): object {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    cuisineTypes: r.cuisineTypes,
    priceRange: r.priceRange,
    avgRating: Number(r.avgRating),
    totalOrders: r.totalOrders,
    avgPrepTimeMinutes: r.avgPrepTimeMinutes,
    minOrderAmount: Number(r.minOrderAmount),
    deliveryFee: Number(r.deliveryFee),
    isOpen: r.isOpen,
    status: r.status,
    lat: Number(r.lat),
    lng: Number(r.lng),
    city: r.city,
    fullAddress: r.fullAddress,
    coverImageUrl: r.coverImageUrl,
    logoUrl: r.logoUrl,
    updatedAt: r.updatedAt.toISOString(),
  }
}

function toMenuItemPayload(item: MenuItem, restaurant: Restaurant): object {
  return {
    id: item.id,
    restaurantId: item.restaurantId,
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
    name: item.name,
    description: item.description,
    basePrice: Number(item.basePrice),
    currency: item.currency,
    isAvailable: item.isAvailable,
    tags: item.tags,
    isVegetarian: item.isVegetarian,
    isVegan: item.isVegan,
    isGlutenFree: item.isGlutenFree,
    isHalal: item.isHalal,
    imageUrl: item.imageUrl,
  }
}

@Injectable()
export class RestaurantEventsListener {
  private readonly logger = new Logger(RestaurantEventsListener.name)

  constructor(
    private readonly kafka: KafkaProducerService,
    private readonly restaurantsService: RestaurantsService,
    private readonly menuService: MenuService,
  ) {}

  // ─── Restaurant events ────────────────────────────────────────────────────

  @OnEvent('restaurant.created')
  public async onRestaurantCreated(payload: { restaurantId: string }): Promise<void> {
    await this.publishRestaurantEvent('restaurant.created', payload.restaurantId)
  }

  @OnEvent('restaurant.updated')
  public async onRestaurantUpdated(payload: { restaurantId: string }): Promise<void> {
    await this.publishRestaurantEvent('restaurant.updated', payload.restaurantId)
  }

  @OnEvent('restaurant.approved')
  public async onRestaurantApproved(payload: { restaurantId: string }): Promise<void> {
    await this.publishRestaurantEvent('restaurant.approved', payload.restaurantId)
  }

  @OnEvent('restaurant.deleted')
  public async onRestaurantDeleted(payload: { restaurantId: string }): Promise<void> {
    await this.kafka.publish(RESTAURANT_EVENTS_TOPIC, {
      type: 'restaurant.deleted',
      payload: { id: payload.restaurantId },
    })
    this.logger.debug(`Published restaurant.deleted for ${payload.restaurantId}`)
  }

  // ─── Menu item events ─────────────────────────────────────────────────────

  @OnEvent('menu_item.created')
  public async onMenuItemCreated(payload: { itemId: string; restaurantId: string }): Promise<void> {
    await this.publishMenuItemEvent('menu_item.created', payload.itemId, payload.restaurantId)
  }

  @OnEvent('menu_item.updated')
  public async onMenuItemUpdated(payload: { itemId: string; restaurantId: string }): Promise<void> {
    await this.publishMenuItemEvent('menu_item.updated', payload.itemId, payload.restaurantId)
  }

  @OnEvent('menu_item.deleted')
  public async onMenuItemDeleted(payload: { itemId: string }): Promise<void> {
    await this.kafka.publish(SEARCH_INDEXING_TOPIC, {
      type: 'menu_item.deleted',
      payload: { id: payload.itemId },
    })
    this.logger.debug(`Published menu_item.deleted for ${payload.itemId}`)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async publishRestaurantEvent(type: string, restaurantId: string): Promise<void> {
    try {
      const restaurant = await this.restaurantsService.findById(restaurantId)
      await this.kafka.publish(RESTAURANT_EVENTS_TOPIC, {
        type,
        payload: toRestaurantPayload(restaurant),
      })
      this.logger.debug(`Published ${type} for restaurant ${restaurantId}`)
    } catch (err) {
      this.logger.error(`Failed to publish ${type} for ${restaurantId}: ${String(err)}`)
    }
  }

  private async publishMenuItemEvent(
    type: string,
    itemId: string,
    restaurantId: string,
  ): Promise<void> {
    try {
      const [item, restaurant] = await Promise.all([
        this.menuService.getItem(restaurantId, itemId),
        this.restaurantsService.findById(restaurantId),
      ])
      await this.kafka.publish(SEARCH_INDEXING_TOPIC, {
        type,
        payload: toMenuItemPayload(item, restaurant),
      })
      this.logger.debug(`Published ${type} for menu item ${itemId}`)
    } catch (err) {
      this.logger.error(`Failed to publish ${type} for item ${itemId}: ${String(err)}`)
    }
  }
}
