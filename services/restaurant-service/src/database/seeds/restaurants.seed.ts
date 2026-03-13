import type { DayOfWeek, RestaurantStatus } from '@grab/types'
import type { DataSource } from 'typeorm'

import { MenuCategory } from '../../menu/entities/menu-category.entity'
import { MenuItem } from '../../menu/entities/menu-item.entity'
import { MenuItemAddon } from '../../menu/entities/menu-item-addon.entity'
import { MenuItemVariant } from '../../menu/entities/menu-item-variant.entity'
import { OperatingHours } from '../../restaurants/entities/operating-hours.entity'
import { Restaurant } from '../../restaurants/entities/restaurant.entity'

const RESTAURANT_OWNER_ID = '11111111-1111-1111-1111-111111111111'
const DEMO_RESTAURANT_ID = '33333333-3333-3333-3333-333333333333'

export async function seedRestaurants(dataSource: DataSource): Promise<void> {
  const restaurantRepo = dataSource.getRepository(Restaurant)
  const operatingHoursRepo = dataSource.getRepository(OperatingHours)
  const categoryRepo = dataSource.getRepository(MenuCategory)
  const itemRepo = dataSource.getRepository(MenuItem)
  const variantRepo = dataSource.getRepository(MenuItemVariant)
  const addonRepo = dataSource.getRepository(MenuItemAddon)

  const existing = await restaurantRepo.findOne({ where: { slug: 'demo-pho-house' } })
  if (existing) {
    return
  }

  const restaurant = restaurantRepo.create({
    id: DEMO_RESTAURANT_ID,
    ownerId: RESTAURANT_OWNER_ID,
    name: 'Demo Pho House',
    slug: 'demo-pho-house',
    description: 'A demo Vietnamese pho restaurant for local development and testing.',
    coverImageUrl: null,
    logoUrl: null,
    fullAddress: '123 Demo Street, District 1, Ho Chi Minh City, Vietnam',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    lat: 10.775843,
    lng: 106.700806,
    phone: '+84900000001',
    cuisineTypes: ['Vietnamese', 'Noodles'],
    priceRange: 2,
    status: 'active' as RestaurantStatus,
    isOpen: true,
    approvedAt: new Date(),
    approvedBy: 'system',
    rejectionReason: null,
    avgRating: 4.8,
    totalReviews: 0,
    totalOrders: 0,
    avgPrepTimeMinutes: 20,
    minOrderAmount: 50000,
    deliveryFee: 15000,
  })

  await restaurantRepo.save(restaurant)

  const days: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  const operatingHours = days.map((day) =>
    operatingHoursRepo.create({
      restaurantId: restaurant.id,
      restaurant,
      dayOfWeek: day,
      openTime: '09:00',
      closeTime: '22:00',
      isClosed: false,
    }),
  )

  await operatingHoursRepo.save(operatingHours)

  const category = categoryRepo.create({
    restaurantId: restaurant.id,
    restaurant,
    name: 'Signature Pho',
    description: 'Best-selling signature pho dishes.',
    imageUrl: null,
    sortOrder: 1,
    isActive: true,
  })

  await categoryRepo.save(category)

  const phoBo = itemRepo.create({
    categoryId: category.id,
    category,
    restaurantId: restaurant.id,
    name: 'Pho Bo (Beef Pho)',
    description: 'Traditional Vietnamese beef noodle soup with fresh herbs.',
    imageUrl: null,
    basePrice: 65000,
    currency: 'VND',
    isAvailable: true,
    prepTimeMinutes: 15,
    calories: 450,
    tags: ['beef', 'noodles', 'soup'],
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isHalal: false,
    isSpicy: false,
    spicyLevel: null,
  })

  await itemRepo.save(phoBo)

  const largeSize = variantRepo.create({
    itemId: phoBo.id,
    item: phoBo,
    name: 'Large',
    priceAdjustment: 15000,
    isDefault: false,
  })

  const extraBeef = addonRepo.create({
    itemId: phoBo.id,
    item: phoBo,
    name: 'Extra beef',
    price: 20000,
    maxQuantity: 2,
    isRequired: false,
  })

  const egg = addonRepo.create({
    itemId: phoBo.id,
    item: phoBo,
    name: 'Soft-boiled egg',
    price: 10000,
    maxQuantity: 1,
    isRequired: false,
  })

  await variantRepo.save(largeSize)
  await addonRepo.save([extraBeef, egg])
}
