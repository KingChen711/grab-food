import type { UserRole } from '@grab/types'
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { USER_EVENTS, UserRegisteredEvent, UserVerifiedEvent } from '../auth/events/user.events'
import type { CreateAddressDto } from './dto/create-address.dto'
import type { UpdateAddressDto } from './dto/update-address.dto'
import type { UpdateProfileDto } from './dto/update-profile.dto'
import type { User } from './entities/user.entity'
import type { UserAddress } from './entities/user-address.entity'
import type { UserDevice } from './entities/user-device.entity'
import type { UserProfile } from './entities/user-profile.entity'
import { GeocodingService } from './geocoding.service'
import { UsersRepository } from './users.repository'

export interface CreateUserParams {
  email?: string
  phone?: string
  googleId?: string
  passwordHash?: string
  fullName: string
  role?: UserRole
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(UsersRepository) private readonly usersRepo: UsersRepository,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(GeocodingService) private readonly geocoding: GeocodingService,
  ) {}

  public async create(params: CreateUserParams): Promise<User> {
    if (params.email && (await this.usersRepo.existsByEmail(params.email))) {
      throw new ConflictException('Email is already registered')
    }

    if (params.phone && (await this.usersRepo.existsByPhone(params.phone))) {
      throw new ConflictException('Phone number is already registered')
    }

    const user = await this.usersRepo.createWithProfile({
      email: params.email ?? null,
      phone: params.phone ?? null,
      googleId: params.googleId ?? null,
      passwordHash: params.passwordHash ?? null,
      role: params.role ?? 'customer',
      status: 'pending_verification',
      isEmailVerified: false,
      isPhoneVerified: false,
      profile: { fullName: params.fullName },
    })

    this.eventEmitter.emit(
      USER_EVENTS.REGISTERED,
      new UserRegisteredEvent(user.id, user.email, user.phone, user.role, new Date()),
    )

    return user
  }

  public async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findById(id)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findByEmail(email)
  }

  public async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepo.findByPhone(phone)
  }

  public async findByIdWithPassword(id: string): Promise<User | null> {
    return this.usersRepo.findByIdWithPassword(id)
  }

  public async markEmailVerified(id: string): Promise<void> {
    await this.usersRepo.updateStatus(id, { isEmailVerified: true, status: 'active' })
    this.eventEmitter.emit(USER_EVENTS.VERIFIED, new UserVerifiedEvent(id, 'email', new Date()))
  }

  public async markPhoneVerified(id: string): Promise<void> {
    await this.usersRepo.updateStatus(id, { isPhoneVerified: true, status: 'active' })
    this.eventEmitter.emit(USER_EVENTS.VERIFIED, new UserVerifiedEvent(id, 'phone', new Date()))
  }

  public async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.usersRepo.updatePasswordHash(id, passwordHash)
  }

  public async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepo.findByGoogleId(googleId)
  }

  public async linkGoogleId(userId: string, googleId: string): Promise<void> {
    await this.usersRepo.linkGoogleId(userId, googleId)
  }

  public async getAddresses(userId: string): Promise<UserAddress[]> {
    return this.usersRepo.findAddressesByUser(userId)
  }

  public async addAddress(userId: string, dto: CreateAddressDto): Promise<UserAddress> {
    let { lat, lng } = dto
    if (!lat || !lng) {
      const coords = await this.geocoding.getCoordinatesFromAddress(dto.fullAddress)
      lat = coords.lat
      lng = coords.lng
    }

    if (dto.isDefault) {
      await this.usersRepo.unsetDefaultAddresses(userId)
    } else {
      const existing = await this.getAddresses(userId)
      if (existing.length === 0) {
        dto.isDefault = true
      }
    }

    const address = await this.usersRepo.addAddress(userId, { ...dto, lat, lng })
    this.eventEmitter.emit(USER_EVENTS.ADDRESS_ADDED, { userId, addressId: address.id })
    return address
  }

  public async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<void> {
    const address = await this.usersRepo.findAddressById(addressId, userId)
    if (!address) throw new NotFoundException('Address not found')

    let { lat, lng } = dto
    if (dto.fullAddress && (!lat || !lng)) {
      const coords = await this.geocoding.getCoordinatesFromAddress(dto.fullAddress)
      lat = coords.lat
      lng = coords.lng
    }

    if (dto.isDefault && !address.isDefault) {
      await this.usersRepo.unsetDefaultAddresses(userId)
    }

    await this.usersRepo.updateAddress(addressId, { ...dto, lat, lng })
  }

  public async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.usersRepo.findAddressById(addressId, userId)
    if (!address) throw new NotFoundException('Address not found')
    await this.usersRepo.deleteAddress(addressId)
  }

  public async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.usersRepo.findAddressById(addressId, userId)
    if (!address) throw new NotFoundException('Address not found')
    await this.usersRepo.unsetDefaultAddresses(userId)
    await this.usersRepo.setDefaultAddress(addressId)
  }

  public async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.findById(userId)
    return user.profile
  }

  public async updateProfile(userId: string, dto: UpdateProfileDto): Promise<void> {
    await this.usersRepo.updateProfile(userId, dto)
    this.eventEmitter.emit(USER_EVENTS.PROFILE_UPDATED, { userId, dto })
  }

  public async getDevices(userId: string): Promise<UserDevice[]> {
    return this.usersRepo.findDevicesByUser(userId)
  }
}
