import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Inventory } from './entities/inventory.entity'

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name)

  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async getByRestaurant(restaurantId: string): Promise<Inventory[]> {
    return this.inventoryRepo.find({ where: { restaurantId } })
  }

  public async upsert(
    restaurantId: string,
    itemId: string,
    quantity: number,
    lowStockThreshold?: number,
    isTracked?: boolean,
  ): Promise<Inventory> {
    let inventory = await this.inventoryRepo.findOne({ where: { itemId, restaurantId } })

    if (inventory) {
      inventory.quantity = quantity
      if (lowStockThreshold !== undefined) inventory.lowStockThreshold = lowStockThreshold
      if (isTracked !== undefined) inventory.isTracked = isTracked
    } else {
      inventory = this.inventoryRepo.create({
        restaurantId,
        itemId,
        quantity,
        lowStockThreshold: lowStockThreshold ?? 5,
        isTracked: isTracked ?? false,
      })
    }

    const saved = await this.inventoryRepo.save(inventory)

    if (saved.isTracked && saved.quantity <= saved.lowStockThreshold) {
      this.logger.warn(`Low stock for item ${itemId}: ${saved.quantity} remaining`)
      this.eventEmitter.emit('inventory.low_stock', {
        restaurantId,
        itemId,
        quantity: saved.quantity,
      })
    }

    if (saved.isTracked && saved.quantity === 0) {
      this.eventEmitter.emit('inventory.out_of_stock', { restaurantId, itemId })
    }

    return saved
  }

  public async decrement(itemId: string, amount = 1): Promise<void> {
    const inventory = await this.inventoryRepo.findOne({ where: { itemId } })
    if (!inventory || !inventory.isTracked) return

    inventory.quantity = Math.max(0, inventory.quantity - amount)
    await this.inventoryRepo.save(inventory)

    if (inventory.quantity <= inventory.lowStockThreshold) {
      this.eventEmitter.emit('inventory.low_stock', {
        restaurantId: inventory.restaurantId,
        itemId,
        quantity: inventory.quantity,
      })
    }

    if (inventory.quantity === 0) {
      this.eventEmitter.emit('inventory.out_of_stock', {
        restaurantId: inventory.restaurantId,
        itemId,
      })
    }
  }

  public async findByItem(itemId: string): Promise<Inventory> {
    const inventory = await this.inventoryRepo.findOne({ where: { itemId } })
    if (!inventory) throw new NotFoundException(`Inventory for item ${itemId} not found`)
    return inventory
  }
}
