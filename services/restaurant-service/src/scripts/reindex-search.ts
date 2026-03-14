/**
 * reindex-search.ts
 *
 * Publishes all restaurants and menu items from PostgreSQL to Kafka so the
 * search-service can rebuild its Elasticsearch index from scratch.
 *
 * Usage:
 *   pnpm reindex         (from services/restaurant-service)
 *
 * Run this after:
 *   - Database seeding
 *   - Elasticsearch index wipe / re-mapping
 *   - Any bulk data import that bypassed the API
 *
 * Environment variables (same as the service):
 *   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD,
 *   RESTAURANT_SERVICE_DB, KAFKA_BROKER
 */

import 'reflect-metadata'

import { Kafka } from 'kafkajs'
import { DataSource } from 'typeorm'

import { MenuCategory } from '../menu/entities/menu-category.entity'
import { MenuItem } from '../menu/entities/menu-item.entity'
import { MenuItemAddon } from '../menu/entities/menu-item-addon.entity'
import { MenuItemVariant } from '../menu/entities/menu-item-variant.entity'
import { OperatingHours } from '../restaurants/entities/operating-hours.entity'
import { Restaurant } from '../restaurants/entities/restaurant.entity'
import { RestaurantReview } from '../reviews/entities/restaurant-review.entity'

const RESTAURANT_EVENTS_TOPIC = 'restaurant.events'
const SEARCH_INDEXING_TOPIC = 'search.indexing'
const BATCH_SIZE = 100

// ── DB ────────────────────────────────────────────────────────────────────────

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'grab_user',
  password: process.env.POSTGRES_PASSWORD ?? 'grab_password',
  database: process.env.RESTAURANT_SERVICE_DB ?? 'grab_restaurants',
  entities: [
    Restaurant,
    OperatingHours,
    MenuCategory,
    MenuItem,
    MenuItemVariant,
    MenuItemAddon,
    RestaurantReview,
  ],
  synchronize: false,
})

// ── Kafka ─────────────────────────────────────────────────────────────────────

const kafka = new Kafka({
  clientId: 'restaurant-service-reindex',
  brokers: [process.env.KAFKA_BROKER ?? 'localhost:9092'],
})
const producer = kafka.producer()

// ── Payload builders ──────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function reindex(): Promise<void> {
  console.log('Connecting to PostgreSQL...')
  await dataSource.initialize()

  console.log('Connecting to Kafka...')
  await producer.connect()

  const restaurantRepo = dataSource.getRepository(Restaurant)
  const menuItemRepo = dataSource.getRepository(MenuItem)

  // ── Restaurants ────────────────────────────────────────────────────────────

  const totalRestaurants = await restaurantRepo.count()
  console.log(`\nIndexing ${totalRestaurants} restaurants...`)

  let restaurantOffset = 0
  let restaurantCount = 0

  while (restaurantOffset < totalRestaurants) {
    const restaurants = await restaurantRepo.find({
      skip: restaurantOffset,
      take: BATCH_SIZE,
      order: { createdAt: 'ASC' },
    })

    const messages = restaurants.map((r) => ({
      value: JSON.stringify({ type: 'restaurant.created', payload: toRestaurantPayload(r) }),
    }))

    await producer.send({ topic: RESTAURANT_EVENTS_TOPIC, messages })

    restaurantCount += restaurants.length
    restaurantOffset += BATCH_SIZE
    process.stdout.write(`\r  ${restaurantCount}/${totalRestaurants} restaurants published`)
  }

  console.log('\n  Done.')

  // ── Menu items ─────────────────────────────────────────────────────────────

  const totalItems = await menuItemRepo.count()
  console.log(`\nIndexing ${totalItems} menu items...`)

  // Build restaurant lookup map to avoid N+1 queries
  const allRestaurants = await restaurantRepo.find({ select: ['id', 'name', 'slug'] })
  const restaurantMap = new Map(allRestaurants.map((r) => [r.id, r]))

  let itemOffset = 0
  let itemCount = 0

  while (itemOffset < totalItems) {
    const items = await menuItemRepo.find({
      skip: itemOffset,
      take: BATCH_SIZE,
      order: { createdAt: 'ASC' },
    })

    const messages = items
      .map((item) => {
        const restaurant = restaurantMap.get(item.restaurantId)
        if (!restaurant) return null
        return {
          value: JSON.stringify({
            type: 'menu_item.created',
            payload: toMenuItemPayload(item, restaurant),
          }),
        }
      })
      .filter((m): m is { value: string } => m !== null)

    if (messages.length > 0) {
      await producer.send({ topic: SEARCH_INDEXING_TOPIC, messages })
    }

    itemCount += items.length
    itemOffset += BATCH_SIZE
    process.stdout.write(`\r  ${itemCount}/${totalItems} menu items published`)
  }

  console.log('\n  Done.')
  console.log(
    `\nReindex complete. Published ${restaurantCount} restaurants and ${itemCount} menu items.`,
  )
}

reindex()
  .catch((err) => {
    console.error('Reindex failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await producer.disconnect().catch(() => {})
    await dataSource.destroy().catch(() => {})
  })
