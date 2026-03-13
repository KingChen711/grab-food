import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Inventory } from '../inventory/entities/inventory.entity'
import { MenuCategory } from '../menu/entities/menu-category.entity'
import { MenuItem } from '../menu/entities/menu-item.entity'
import { MenuItemAddon } from '../menu/entities/menu-item-addon.entity'
import { MenuItemVariant } from '../menu/entities/menu-item-variant.entity'
import { OperatingHours } from '../restaurants/entities/operating-hours.entity'
import { Restaurant } from '../restaurants/entities/restaurant.entity'
import { RestaurantReview } from '../reviews/entities/restaurant-review.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [
          Restaurant,
          OperatingHours,
          MenuCategory,
          MenuItem,
          MenuItemVariant,
          MenuItemAddon,
          Inventory,
          RestaurantReview,
        ],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
