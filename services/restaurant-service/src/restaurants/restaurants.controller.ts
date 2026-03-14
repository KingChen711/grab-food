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
  Put,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { CreateRestaurantDto } from './dto/create-restaurant.dto'
import { OperatingHoursDto } from './dto/operating-hours.dto'
import { UpdateDayHoursDto } from './dto/update-day-hours.dto'
import { UpdateRestaurantDto } from './dto/update-restaurant.dto'
import type { OperatingHours } from './entities/operating-hours.entity'
import type { Restaurant } from './entities/restaurant.entity'
import { RestaurantsService } from './restaurants.service'

class RejectDto {
  public reason: string
}

@ApiTags('restaurants')
@ApiBearerAuth()
@Controller('restaurants')
export class RestaurantsController {
  constructor(@Inject(RestaurantsService) private readonly service: RestaurantsService) {}

  // ─── Public listing ───────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active restaurants' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Paginated restaurant list' })
  public async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('city') city?: string,
    @Query('search') search?: string,
  ): Promise<{ items: Restaurant[]; total: number; page: number; limit: number }> {
    const p = page ?? 1
    const l = Math.min(limit ?? 20, 100)
    const [items, total] = await this.service.findAll({
      page: p,
      limit: l,
      city,
      search,
      status: 'active',
    })
    return { items, total, page: p, limit: l }
  }

  @Public()
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get restaurant by slug' })
  @ApiResponse({ status: 200, description: 'Restaurant details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  public findBySlug(@Param('slug') slug: string): Promise<Restaurant> {
    return this.service.findBySlug(slug)
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant by ID' })
  @ApiResponse({ status: 200, description: 'Restaurant details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  public findOne(@Param('id') id: string): Promise<Restaurant> {
    return this.service.findById(id)
  }

  // ─── Owner & Admin ────────────────────────────────────────────────────────

  @Get('owner/me')
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Get my restaurants' })
  @ApiResponse({ status: 200 })
  public myRestaurants(@CurrentUser() user: JwtPayload): Promise<Restaurant[]> {
    return this.service.findByOwner(user.sub)
  }

  @Post()
  @Roles('restaurant_owner', 'admin')
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Create restaurant (owner)' })
  @ApiResponse({ status: 201, description: 'Created — status: pending, awaiting admin approval' })
  public create(
    @Body() dto: CreateRestaurantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Restaurant> {
    return this.service.create(dto, user)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Update restaurant (owner)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Not your restaurant' })
  public update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.update(id, dto, user)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Delete restaurant (owner or admin)' })
  @ApiResponse({ status: 204 })
  public remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.service.remove(id, user)
  }

  @Patch(':id/open')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Toggle open/closed status (owner)' })
  @ApiResponse({ status: 204 })
  public toggleOpen(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.service.toggleOpen(id, user)
  }

  // ─── Admin approval workflow ──────────────────────────────────────────────

  @Get('admin/pending')
  @Roles('admin')
  @ApiOperation({ summary: 'List pending restaurants (admin)' })
  @ApiResponse({ status: 200 })
  public async listPending(): Promise<{ items: Restaurant[]; total: number }> {
    const [items, total] = await this.service.findAll({ status: 'pending', limit: 100 })
    return { items, total }
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @ApiOperation({ summary: 'Approve restaurant (admin)' })
  @ApiResponse({ status: 204 })
  public approve(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.service.approve(id, user.sub)
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @ApiOperation({ summary: 'Reject restaurant with reason (admin)' })
  @ApiResponse({ status: 204 })
  public reject(
    @Param('id') id: string,
    @Body() dto: RejectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.reject(id, user.sub, dto.reason)
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @ApiOperation({ summary: 'Suspend restaurant (admin)' })
  @ApiResponse({ status: 204 })
  public suspend(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.service.suspend(id, user.sub)
  }

  // ─── Images ───────────────────────────────────────────────────────────────
  //
  // Client flow (after uploading via media-service):
  //   1. POST /uploads/presigned  → { uploadId, presignedUrl }   (media-service)
  //   2. PUT  presignedUrl        → upload file directly to MinIO
  //   3. POST /uploads/:id/confirm                               (media-service)
  //   4. GET  /uploads/:id        → poll until status = DONE, get CDN urls
  //   5. PATCH /restaurants/:id/cover-image  { url: cdnUrl }     (here)

  @Patch(':id/cover-image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({
    summary: 'Update restaurant cover image URL after media-service processing (owner)',
  })
  @ApiResponse({ status: 204 })
  public updateCoverImage(
    @Param('id') id: string,
    @Body() dto: { url: string },
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.updateCoverImage(id, dto.url, user)
  }

  @Patch(':id/logo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Update restaurant logo URL after media-service processing (owner)' })
  @ApiResponse({ status: 204 })
  public updateLogo(
    @Param('id') id: string,
    @Body() dto: { url: string },
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.updateLogo(id, dto.url, user)
  }

  // ─── Operating hours ──────────────────────────────────────────────────────

  @Public()
  @Get(':id/hours')
  @ApiOperation({ summary: 'Get operating hours for a restaurant' })
  @ApiResponse({ status: 200 })
  public getHours(@Param('id') id: string): Promise<OperatingHours[]> {
    return this.service.getHours(id)
  }

  @Put(':id/hours')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({ summary: 'Replace full week operating hours (owner)' })
  @ApiResponse({ status: 204 })
  public updateAllHours(
    @Param('id') id: string,
    @Body() dto: { hours: OperatingHoursDto[] },
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.updateAllHours(id, dto.hours, user)
  }

  @Patch(':id/hours/:day')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('restaurant_owner', 'admin')
  @ApiOperation({
    summary: 'Update a single day operating hours (owner). day: MON|TUE|WED|THU|FRI|SAT|SUN',
  })
  @ApiResponse({ status: 204 })
  public updateDayHours(
    @Param('id') id: string,
    @Param('day') day: string,
    @Body() dto: UpdateDayHoursDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.service.updateDayHours(id, day, dto, user)
  }
}
