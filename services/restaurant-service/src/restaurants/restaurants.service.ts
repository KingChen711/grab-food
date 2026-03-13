import type { JwtPayload, RestaurantStatus } from '@grab/types'
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { FindOptionsWhere, ILike, Repository } from 'typeorm'

import type { CreateRestaurantDto } from './dto/create-restaurant.dto'
import type { UpdateRestaurantDto } from './dto/update-restaurant.dto'
import { OperatingHours } from './entities/operating-hours.entity'
import { Restaurant } from './entities/restaurant.entity'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function uniqueSlug(
  base: string,
  repo: Repository<Restaurant>,
  excludeId?: string,
): Promise<string> {
  const slug = slugify(base)
  let suffix = 0

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`
    const existing = await repo.findOne({ where: { slug: candidate } })
    if (!existing || existing.id === excludeId) return candidate
    suffix++
  }
}

export interface RestaurantListOptions {
  page?: number
  limit?: number
  city?: string
  search?: string
  status?: RestaurantStatus
}

@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name)

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(OperatingHours)
    private readonly hoursRepo: Repository<OperatingHours>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  public async create(dto: CreateRestaurantDto, owner: JwtPayload): Promise<Restaurant> {
    const slug = await uniqueSlug(dto.name, this.restaurantRepo)

    const restaurant = this.restaurantRepo.create({
      ownerId: owner.sub,
      name: dto.name,
      slug,
      description: dto.description ?? null,
      coverImageUrl: dto.coverImageUrl ?? null,
      logoUrl: dto.logoUrl ?? null,
      fullAddress: dto.fullAddress,
      city: dto.city,
      country: dto.country,
      lat: dto.lat,
      lng: dto.lng,
      phone: dto.phone,
      cuisineTypes: dto.cuisineTypes,
      priceRange: dto.priceRange,
      minOrderAmount: dto.minOrderAmount ?? 0,
      deliveryFee: dto.deliveryFee ?? 0,
      status: 'pending',
    })

    const saved = await this.restaurantRepo.save(restaurant)

    if (dto.operatingHours?.length) {
      const hours = dto.operatingHours.map((h) =>
        this.hoursRepo.create({
          restaurantId: saved.id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime ?? '09:00',
          closeTime: h.closeTime ?? '22:00',
          isClosed: h.isClosed ?? false,
        }),
      )
      await this.hoursRepo.save(hours)
    }

    this.logger.log(`Restaurant created: ${saved.id} (${saved.name}) by owner ${owner.sub}`)
    this.eventEmitter.emit('restaurant.created', { restaurantId: saved.id, ownerId: owner.sub })

    return this.findById(saved.id)
  }

  public async findAll(options: RestaurantListOptions = {}): Promise<[Restaurant[], number]> {
    const { page = 1, limit = 20, city, search, status } = options
    const skip = (page - 1) * limit

    const where: FindOptionsWhere<Restaurant> = {}
    if (status) where.status = status
    if (city) where.city = ILike(`%${city}%`)

    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.operatingHours', 'oh')
      .skip(skip)
      .take(limit)
      .orderBy('r.avgRating', 'DESC')

    if (status) qb.andWhere('r.status = :status', { status })
    if (city) qb.andWhere('r.city ILIKE :city', { city: `%${city}%` })
    if (search) qb.andWhere('r.name ILIKE :search', { search: `%${search}%` })

    return qb.getManyAndCount()
  }

  public async findById(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id },
      relations: ['operatingHours'],
    })
    if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`)
    return restaurant
  }

  public async findByOwner(ownerId: string): Promise<Restaurant[]> {
    return this.restaurantRepo.find({
      where: { ownerId },
      relations: ['operatingHours'],
      order: { createdAt: 'DESC' },
    })
  }

  public async update(id: string, dto: UpdateRestaurantDto, requester: JwtPayload): Promise<void> {
    const restaurant = await this.findById(id)
    this.assertOwnership(restaurant, requester)

    if (dto.name && dto.name !== restaurant.name) {
      ;(dto as Record<string, unknown>)['slug'] = await uniqueSlug(
        dto.name,
        this.restaurantRepo,
        id,
      )
    }

    const { operatingHours, ...rest } = dto
    await this.restaurantRepo.update(id, rest as Partial<Restaurant>)

    if (operatingHours) {
      await this.hoursRepo.delete({ restaurantId: id })
      const hours = operatingHours.map((h) =>
        this.hoursRepo.create({
          restaurantId: id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime ?? '09:00',
          closeTime: h.closeTime ?? '22:00',
          isClosed: h.isClosed ?? false,
        }),
      )
      await this.hoursRepo.save(hours)
    }

    this.logger.log(`Restaurant updated: ${id}`)
  }

  public async remove(id: string, requester: JwtPayload): Promise<void> {
    const restaurant = await this.findById(id)
    if (requester.role !== 'admin') this.assertOwnership(restaurant, requester)
    await this.restaurantRepo.remove(restaurant)
    this.logger.log(`Restaurant deleted: ${id}`)
  }

  // ─── Approval workflow ────────────────────────────────────────────────────

  public async approve(id: string, adminId: string): Promise<void> {
    await this.findById(id) // ensure exists
    await this.restaurantRepo.update(id, {
      status: 'active',
      approvedAt: new Date(),
      approvedBy: adminId,
      rejectionReason: null,
    })
    this.logger.log(`Restaurant approved: ${id} by admin ${adminId}`)
    this.eventEmitter.emit('restaurant.approved', { restaurantId: id, adminId })
  }

  public async reject(id: string, adminId: string, reason: string): Promise<void> {
    await this.findById(id)
    await this.restaurantRepo.update(id, {
      status: 'pending',
      rejectionReason: reason,
      approvedBy: null,
    })
    this.logger.log(`Restaurant rejected: ${id} by admin ${adminId}`)
  }

  public async suspend(id: string, adminId: string): Promise<void> {
    await this.findById(id)
    await this.restaurantRepo.update(id, { status: 'suspended' })
    this.logger.log(`Restaurant suspended: ${id} by admin ${adminId}`)
    this.eventEmitter.emit('restaurant.suspended', { restaurantId: id, adminId })
  }

  public async toggleOpen(id: string, requester: JwtPayload): Promise<void> {
    const restaurant = await this.findById(id)
    this.assertOwnership(restaurant, requester)
    await this.restaurantRepo.update(id, { isOpen: !restaurant.isOpen })
  }

  // ─── Stats (called by order-service events) ───────────────────────────────

  public async incrementOrderCount(id: string): Promise<void> {
    await this.restaurantRepo.increment({ id }, 'totalOrders', 1)
  }

  public async updateRating(id: string, newAvg: number, totalReviews: number): Promise<void> {
    await this.restaurantRepo.update(id, { avgRating: newAvg, totalReviews })
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private assertOwnership(restaurant: Restaurant, requester: JwtPayload): void {
    if (restaurant.ownerId !== requester.sub) {
      throw new ForbiddenException('You do not own this restaurant')
    }
  }
}
