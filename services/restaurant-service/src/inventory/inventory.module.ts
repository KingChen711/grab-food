import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { RestaurantsModule } from '../restaurants/restaurants.module'
import { Inventory } from './entities/inventory.entity'
import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'

@Module({
  imports: [TypeOrmModule.forFeature([Inventory]), RestaurantsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
