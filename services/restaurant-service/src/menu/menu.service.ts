import type { JwtPayload } from '@grab/types'
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'

import { Restaurant } from '../restaurants/entities/restaurant.entity'
import type { CreateCategoryDto } from './dto/create-category.dto'
import type { CreateMenuItemDto } from './dto/create-menu-item.dto'
import type { UpdateCategoryDto } from './dto/update-category.dto'
import type { UpdateMenuItemDto } from './dto/update-menu-item.dto'
import { MenuCategory } from './entities/menu-category.entity'
import { MenuItem } from './entities/menu-item.entity'
import { MenuItemAddon } from './entities/menu-item-addon.entity'
import { MenuItemVariant } from './entities/menu-item-variant.entity'

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name)

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuCategory)
    private readonly categoryRepo: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly itemRepo: Repository<MenuItem>,
    @InjectRepository(MenuItemVariant)
    private readonly variantRepo: Repository<MenuItemVariant>,
    @InjectRepository(MenuItemAddon)
    private readonly addonRepo: Repository<MenuItemAddon>,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  public async getCategories(restaurantId: string): Promise<MenuCategory[]> {
    return this.categoryRepo.find({
      where: { restaurantId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
  }

  public async getFullMenu(restaurantId: string): Promise<MenuCategory[]> {
    return this.categoryRepo.find({
      where: { restaurantId, isActive: true },
      relations: ['items', 'items.variants', 'items.addons'],
      order: { sortOrder: 'ASC' },
    })
  }

  public async createCategory(
    restaurantId: string,
    dto: CreateCategoryDto,
    requester: JwtPayload,
  ): Promise<MenuCategory> {
    await this.assertRestaurantOwner(restaurantId, requester)

    const category = this.categoryRepo.create({
      restaurantId,
      name: dto.name,
      description: dto.description ?? null,
      imageUrl: dto.imageUrl ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    })

    const saved = await this.categoryRepo.save(category)
    this.logger.log(`Category created: ${saved.id} in restaurant ${restaurantId}`)
    return saved
  }

  public async updateCategory(
    restaurantId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
    requester: JwtPayload,
  ): Promise<void> {
    await this.assertRestaurantOwner(restaurantId, requester)
    await this.findCategory(categoryId, restaurantId)
    await this.categoryRepo.update(categoryId, dto as Partial<MenuCategory>)
  }

  public async removeCategory(
    restaurantId: string,
    categoryId: string,
    requester: JwtPayload,
  ): Promise<void> {
    await this.assertRestaurantOwner(restaurantId, requester)
    const category = await this.findCategory(categoryId, restaurantId)
    await this.categoryRepo.remove(category)
  }

  // ─── Items ────────────────────────────────────────────────────────────────

  public async getItems(restaurantId: string): Promise<MenuItem[]> {
    return this.itemRepo.find({
      where: { restaurantId },
      order: { createdAt: 'ASC' },
    })
  }

  public async createItem(
    restaurantId: string,
    categoryId: string,
    dto: CreateMenuItemDto,
    requester: JwtPayload,
  ): Promise<MenuItem> {
    await this.assertRestaurantOwner(restaurantId, requester)
    await this.findCategory(categoryId, restaurantId)

    const savedId = await this.dataSource.transaction(async (manager) => {
      const item = manager.create(MenuItem, {
        restaurantId,
        categoryId,
        name: dto.name,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        basePrice: dto.basePrice,
        currency: dto.currency ?? 'VND',
        isAvailable: dto.isAvailable ?? true,
        prepTimeMinutes: dto.prepTimeMinutes ?? 15,
        calories: dto.calories ?? null,
        tags: dto.tags ?? [],
        isVegetarian: dto.isVegetarian ?? false,
        isVegan: dto.isVegan ?? false,
        isGlutenFree: dto.isGlutenFree ?? false,
        isHalal: dto.isHalal ?? false,
        isSpicy: dto.isSpicy ?? false,
        spicyLevel: dto.spicyLevel ?? null,
      })

      const saved = await manager.save(item)

      if (dto.variants?.length) {
        await manager.save(
          dto.variants.map((v) =>
            manager.create(MenuItemVariant, {
              itemId: saved.id,
              name: v.name,
              priceAdjustment: v.priceAdjustment ?? 0,
              isDefault: v.isDefault ?? false,
            }),
          ),
        )
      }

      if (dto.addons?.length) {
        await manager.save(
          dto.addons.map((a) =>
            manager.create(MenuItemAddon, {
              itemId: saved.id,
              name: a.name,
              price: a.price ?? 0,
              maxQuantity: a.maxQuantity ?? 1,
              isRequired: a.isRequired ?? false,
            }),
          ),
        )
      }

      return saved.id
    })

    this.logger.log(`Menu item created: ${savedId}`)
    this.eventEmitter.emit('menu_item.created', { itemId: savedId, restaurantId })
    return this.itemRepo.findOneOrFail({
      where: { id: savedId },
      relations: ['variants', 'addons'],
    })
  }

  public async updateItem(
    restaurantId: string,
    itemId: string,
    dto: UpdateMenuItemDto,
    requester: JwtPayload,
  ): Promise<void> {
    await this.assertRestaurantOwner(restaurantId, requester)
    await this.findItem(itemId, restaurantId)

    const { variants, addons, ...rest } = dto
    await this.itemRepo.update(itemId, rest as Partial<MenuItem>)

    if (variants !== undefined) {
      await this.variantRepo.delete({ itemId })
      if (variants.length) {
        await this.variantRepo.save(variants.map((v) => this.variantRepo.create({ itemId, ...v })))
      }
    }

    if (addons !== undefined) {
      await this.addonRepo.delete({ itemId })
      if (addons.length) {
        await this.addonRepo.save(addons.map((a) => this.addonRepo.create({ itemId, ...a })))
      }
    }

    this.eventEmitter.emit('menu_item.updated', { itemId, restaurantId })
  }

  public async removeItem(
    restaurantId: string,
    itemId: string,
    requester: JwtPayload,
  ): Promise<void> {
    await this.assertRestaurantOwner(restaurantId, requester)
    const item = await this.findItem(itemId, restaurantId)
    await this.itemRepo.remove(item)
    this.eventEmitter.emit('menu_item.deleted', { itemId })
  }

  public async getCategory(restaurantId: string, categoryId: string): Promise<MenuCategory> {
    return this.findCategory(categoryId, restaurantId)
  }

  public async getItem(restaurantId: string, itemId: string): Promise<MenuItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, restaurantId },
      relations: ['variants', 'addons'],
    })
    if (!item) throw new NotFoundException(`Menu item ${itemId} not found`)
    return item
  }

  // ─── Variants ─────────────────────────────────────────────────────────────

  public async addVariant(
    restaurantId: string,
    itemId: string,
    dto: { name: string; priceAdjustment?: number; isDefault?: boolean },
    requester: JwtPayload,
  ): Promise<MenuItemVariant> {
    await this.assertRestaurantOwner(restaurantId, requester)
    await this.findItem(itemId, restaurantId)
    const variant = this.variantRepo.create({
      itemId,
      name: dto.name,
      priceAdjustment: dto.priceAdjustment ?? 0,
      isDefault: dto.isDefault ?? false,
    })
    return this.variantRepo.save(variant)
  }

  public async updateVariant(
    restaurantId: string,
    itemId: string,
    variantId: string,
    dto: { name?: string; priceAdjustment?: number; isDefault?: boolean },
    requester: JwtPayload,
  ): Promise<void> {
    await this.assertRestaurantOwner(restaurantId, requester)
    await this.findItem(itemId, restaurantId)
    const variant = await this.variantRepo.findOne({ where: { id: variantId, itemId } })
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`)
    await this.variantRepo.update(variantId, dto)
  }

  public async removeVariant(
    restaurantId: string,
    itemId: string,
    variantId: string,
    requester: JwtPayload,
  ): Promise<void> {
    await this.assertRestaurantOwner(restaurantId, requester)
    await this.findItem(itemId, restaurantId)
    const variant = await this.variantRepo.findOne({ where: { id: variantId, itemId } })
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`)
    await this.variantRepo.remove(variant)
  }

  // ─── Addons ───────────────────────────────────────────────────────────────

  public async addAddon(
    restaurantId: string,
    itemId: string,
    dto: { name: string; price?: number; maxQuantity?: number; isRequired?: boolean },
    requester: JwtPayload,
  ): Promise<MenuItemAddon> {
    await this.assertRestaurantOwner(restaurantId, requester)
    await this.findItem(itemId, restaurantId)
    const addon = this.addonRepo.create({
      itemId,
      name: dto.name,
      price: dto.price ?? 0,
      maxQuantity: dto.maxQuantity ?? 1,
      isRequired: dto.isRequired ?? false,
    })
    return this.addonRepo.save(addon)
  }

  public async updateAddon(
    restaurantId: string,
    itemId: string,
    addonId: string,
    dto: { name?: string; price?: number; maxQuantity?: number; isRequired?: boolean },
    requester: JwtPayload,
  ): Promise<void> {
    await this.assertRestaurantOwner(restaurantId, requester)
    await this.findItem(itemId, restaurantId)
    const addon = await this.addonRepo.findOne({ where: { id: addonId, itemId } })
    if (!addon) throw new NotFoundException(`Addon ${addonId} not found`)
    await this.addonRepo.update(addonId, dto)
  }

  public async removeAddon(
    restaurantId: string,
    itemId: string,
    addonId: string,
    requester: JwtPayload,
  ): Promise<void> {
    await this.assertRestaurantOwner(restaurantId, requester)
    await this.findItem(itemId, restaurantId)
    const addon = await this.addonRepo.findOne({ where: { id: addonId, itemId } })
    if (!addon) throw new NotFoundException(`Addon ${addonId} not found`)
    await this.addonRepo.remove(addon)
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async assertRestaurantOwner(restaurantId: string, requester: JwtPayload): Promise<void> {
    if (requester.role === 'admin') return
    const restaurant = await this.restaurantRepo.findOne({ where: { id: restaurantId } })
    if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`)
    if (restaurant.ownerId !== requester.sub) {
      throw new ForbiddenException('You do not own this restaurant')
    }
  }

  private async findCategory(id: string, restaurantId: string): Promise<MenuCategory> {
    const category = await this.categoryRepo.findOne({ where: { id, restaurantId } })
    if (!category) throw new NotFoundException(`Category ${id} not found`)
    return category
  }

  private async findItem(id: string, restaurantId: string): Promise<MenuItem> {
    const item = await this.itemRepo.findOne({ where: { id, restaurantId } })
    if (!item) throw new NotFoundException(`Menu item ${id} not found`)
    return item
  }
}
