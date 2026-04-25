import { CurrentUser, Public, Roles } from '@grab/nestjs-common'
import type { JwtPayload } from '@grab/types'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { BulkImportCsvDto, BulkImportItemsDto, type BulkImportResult } from './dto/bulk-import.dto'
import { CreateCategoryDto } from './dto/create-category.dto'
import { CreateMenuItemDto } from './dto/create-menu-item.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { UpdateMenuItemDto } from './dto/update-menu-item.dto'
import type { MenuCategory } from './entities/menu-category.entity'
import type { MenuItem } from './entities/menu-item.entity'
import type { MenuItemAddon } from './entities/menu-item-addon.entity'
import type { MenuItemVariant } from './entities/menu-item-variant.entity'
import { MenuService } from './menu.service'

@ApiTags('menu')
@ApiBearerAuth()
@Controller('restaurants/:restaurantId')
export class MenuController {
  constructor(@Inject(MenuService) private readonly menuService: MenuService) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  @Public()
  @Get('menu')
  @ApiOperation({ summary: 'Get full menu (active categories + items)' })
  @ApiResponse({ status: 200 })
  public getFullMenu(@Param('restaurantId') restaurantId: string): Promise<MenuCategory[]> {
    return this.menuService.getFullMenu(restaurantId)
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List all categories' })
  @ApiResponse({ status: 200 })
  public getCategories(@Param('restaurantId') restaurantId: string): Promise<MenuCategory[]> {
    return this.menuService.getCategories(restaurantId)
  }

  @Public()
  @Get('categories/:categoryId')
  @ApiOperation({ summary: 'Get single category' })
  @ApiResponse({ status: 200 })
  public getCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
  ): Promise<MenuCategory> {
    return this.menuService.getCategory(restaurantId, categoryId)
  }

  @Post('categories')
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Create menu category (owner)' })
  @ApiResponse({ status: 201 })
  public createCategory(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MenuCategory> {
    return this.menuService.createCategory(restaurantId, dto, user)
  }

  @Patch('categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Update category (owner)' })
  @ApiResponse({ status: 204 })
  public updateCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.menuService.updateCategory(restaurantId, categoryId, dto, user)
  }

  @Delete('categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Delete category (owner)' })
  @ApiResponse({ status: 204 })
  public removeCategory(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.menuService.removeCategory(restaurantId, categoryId, user)
  }

  // ─── Items ────────────────────────────────────────────────────────────────

  @Public()
  @Get('items')
  @ApiOperation({ summary: 'List all menu items' })
  @ApiResponse({ status: 200 })
  public getItems(@Param('restaurantId') restaurantId: string): Promise<MenuItem[]> {
    return this.menuService.getItems(restaurantId)
  }

  @Public()
  @Get('items/:itemId')
  @ApiOperation({ summary: 'Get single menu item with variants and addons' })
  @ApiResponse({ status: 200 })
  public getItem(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
  ): Promise<MenuItem> {
    return this.menuService.getItem(restaurantId, itemId)
  }

  @Post('categories/:categoryId/items')
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Create menu item in category (owner)' })
  @ApiResponse({ status: 201 })
  public createItem(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateMenuItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MenuItem> {
    return this.menuService.createItem(restaurantId, categoryId, dto, user)
  }

  @Post('categories/:categoryId/items/bulk')
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Bulk-create menu items (JSON array, owner)' })
  @ApiResponse({ status: 201, description: 'All items created in a single transaction' })
  public bulkCreateItems(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: BulkImportItemsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BulkImportResult> {
    return this.menuService.bulkCreateItems(restaurantId, categoryId, dto.items, user)
  }

  @Post('categories/:categoryId/items/import-csv')
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({
    summary: 'Bulk-import menu items from CSV text (owner)',
    description:
      'Submit CSV text in body. Invalid rows are skipped and reported in `errors`. Valid rows are inserted in one transaction.',
  })
  @ApiResponse({ status: 201, description: 'Returns counts and per-row errors' })
  public bulkImportCsv(
    @Param('restaurantId') restaurantId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: BulkImportCsvDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BulkImportResult> {
    return this.menuService.bulkImportItemsCsv(
      restaurantId,
      categoryId,
      dto.csv,
      dto.defaultCurrency,
      user,
    )
  }

  @Patch('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Update menu item (owner)' })
  @ApiResponse({ status: 204 })
  public updateItem(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.menuService.updateItem(restaurantId, itemId, dto, user)
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Delete menu item (owner)' })
  @ApiResponse({ status: 204 })
  public removeItem(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.menuService.removeItem(restaurantId, itemId, user)
  }

  // ─── Variants ────────────────────────────────────────────────────────────

  @Post('items/:itemId/variants')
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Add variant to menu item (owner)' })
  @ApiResponse({ status: 201 })
  public addVariant(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: { name: string; priceAdjustment?: number; isDefault?: boolean },
    @CurrentUser() user: JwtPayload,
  ): Promise<MenuItemVariant> {
    return this.menuService.addVariant(restaurantId, itemId, dto, user)
  }

  @Patch('items/:itemId/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Update variant (owner)' })
  @ApiResponse({ status: 204 })
  public updateVariant(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Param('variantId') variantId: string,
    @Body() dto: { name?: string; priceAdjustment?: number; isDefault?: boolean },
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.menuService.updateVariant(restaurantId, itemId, variantId, dto, user)
  }

  @Delete('items/:itemId/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Delete variant (owner)' })
  @ApiResponse({ status: 204 })
  public removeVariant(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Param('variantId') variantId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.menuService.removeVariant(restaurantId, itemId, variantId, user)
  }

  // ─── Addons ───────────────────────────────────────────────────────────────

  @Post('items/:itemId/addons')
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Add addon to menu item (owner)' })
  @ApiResponse({ status: 201 })
  public addAddon(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Body() dto: { name: string; price?: number; maxQuantity?: number; isRequired?: boolean },
    @CurrentUser() user: JwtPayload,
  ): Promise<MenuItemAddon> {
    return this.menuService.addAddon(restaurantId, itemId, dto, user)
  }

  @Patch('items/:itemId/addons/:addonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Update addon (owner)' })
  @ApiResponse({ status: 204 })
  public updateAddon(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Param('addonId') addonId: string,
    @Body() dto: { name?: string; price?: number; maxQuantity?: number; isRequired?: boolean },
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.menuService.updateAddon(restaurantId, itemId, addonId, dto, user)
  }

  @Delete('items/:itemId/addons/:addonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Delete addon (owner)' })
  @ApiResponse({ status: 204 })
  public removeAddon(
    @Param('restaurantId') restaurantId: string,
    @Param('itemId') itemId: string,
    @Param('addonId') addonId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.menuService.removeAddon(restaurantId, itemId, addonId, user)
  }
}
