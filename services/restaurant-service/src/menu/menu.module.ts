import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Restaurant } from '../restaurants/entities/restaurant.entity'
import { MenuCategory } from './entities/menu-category.entity'
import { MenuItem } from './entities/menu-item.entity'
import { MenuItemAddon } from './entities/menu-item-addon.entity'
import { MenuItemVariant } from './entities/menu-item-variant.entity'
import { MenuController } from './menu.controller'
import { MenuService } from './menu.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant, MenuCategory, MenuItem, MenuItemVariant, MenuItemAddon]),
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
