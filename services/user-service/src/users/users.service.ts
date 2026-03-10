import type { UserRole } from '@grab/types'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { EventEmitter2 } from '@nestjs/event-emitter'

import { USER_EVENTS, UserRegisteredEvent, UserVerifiedEvent } from '../auth/events/user.events'
import type { User } from './entities/user.entity'
import type { UserAddress } from './entities/user-address.entity'
import type { UserDevice } from './entities/user-device.entity'
import type { UsersRepository } from './users.repository'

export interface CreateUserParams {
  email?: string
  phone?: string
  passwordHash?: string
  fullName: string
  role?: UserRole
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
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

  public async getAddresses(userId: string): Promise<UserAddress[]> {
    return this.usersRepo.findAddressesByUser(userId)
  }

  public async getDevices(userId: string): Promise<UserDevice[]> {
    return this.usersRepo.findDevicesByUser(userId)
  }
}
