import { CurrentUser, Roles } from '@grab/nestjs-common'
import type { JwtPayload } from '@grab/types'
import { Body, Controller, Get, Inject, Param, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { RestaurantsService } from '../restaurants/restaurants.service'
import { UpsertInventoryDto } from './dto/upsert-inventory.dto'
import type { Inventory } from './entities/inventory.entity'
import { InventoryService } from './inventory.service'

@ApiTags('inventory')
@ApiBearerAuth()
@Roles('restaurant_owner', 'admin')
@Controller('restaurants/:restaurantId/inventory')
export class InventoryController {
  constructor(
    @Inject(InventoryService) private readonly inventoryService: InventoryService,
    @Inject(RestaurantsService) private readonly restaurantsService: RestaurantsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List inventory for all items in a restaurant (owner)' })
  @ApiResponse({ status: 200 })
  public getAll(@Param('restaurantId') restaurantId: string): Promise<Inventory[]> {
    return this.inventoryService.getByRestaurant(restaurantId)
  }

  @Get(':itemId')
  @ApiOperation({ summary: 'Get inventory for a single item (owner)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  public getOne(@Param('itemId') itemId: string): Promise<Inventory> {
    return this.inventoryService.findByItem(itemId)
  }

  @Put(':itemId')
  @ApiOperation({
    summary: 'Set inventory for an item — creates if not exists, updates if exists (owner)',
  })
  @ApiResponse({ status: 200 })
  public async upsert(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpsertInventoryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Inventory> {
    await this.restaurantsService.assertOwnerOrAdmin(restaurantId, user)
    return this.inventoryService.upsert(
      restaurantId,
      itemId,
      dto.quantity,
      dto.lowStockThreshold,
      dto.isTracked,
    )
  }
}
