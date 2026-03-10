import { Injectable } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import type { DataSource, Repository } from 'typeorm'

import { User } from './entities/user.entity'
import { UserAddress } from './entities/user-address.entity'
import { UserDevice } from './entities/user-device.entity'
import { UserProfile } from './entities/user-profile.entity'

export interface CreateUserData {
  email?: string | null
  phone?: string | null
  passwordHash?: string | null
  role: User['role']
  status: User['status']
  isEmailVerified: boolean
  isPhoneVerified: boolean
  profile: Partial<UserProfile>
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(UserProfile) private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(UserAddress) private readonly addressRepo: Repository<UserAddress>,
    @InjectRepository(UserDevice) private readonly deviceRepo: Repository<UserDevice>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  public async existsByEmail(email: string): Promise<boolean> {
    return this.repo.exists({ where: { email } })
  }

  public async existsByPhone(phone: string): Promise<boolean> {
    return this.repo.exists({ where: { phone } })
  }

  /**
   * Creates user + profile atomically inside a single transaction.
   * Returns the full user (including profile via eager loading).
   */
  public async createWithProfile(data: CreateUserData): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const profile = manager.create(UserProfile, {
        fullName: data.profile.fullName ?? '',
        avatarUrl: data.profile.avatarUrl ?? null,
        dateOfBirth: data.profile.dateOfBirth ?? null,
        bio: data.profile.bio ?? null,
      })

      const user = manager.create(User, {
        email: data.email ?? null,
        phone: data.phone ?? null,
        passwordHash: data.passwordHash ?? null,
        role: data.role,
        status: data.status,
        isEmailVerified: data.isEmailVerified,
        isPhoneVerified: data.isPhoneVerified,
        profile,
      })

      return manager.save(user)
    })
  }

  public async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } })
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.email = :email', { email })
      .getOne()
  }

  public async findByPhone(phone: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.phone = :phone', { phone })
      .getOne()
  }

  public async findByIdWithPassword(id: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.id = :id', { id })
      .getOne()
  }

  public async updateStatus(
    id: string,
    updates: Partial<Pick<User, 'status' | 'isEmailVerified' | 'isPhoneVerified'>>,
  ): Promise<void> {
    await this.repo.update(id, updates)
  }

  public async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.repo.update(id, { passwordHash })
  }

  public async findAddressesByUser(userId: string): Promise<UserAddress[]> {
    return this.addressRepo.find({ where: { user: { id: userId } } })
  }

  public async findDevicesByUser(userId: string): Promise<UserDevice[]> {
    return this.deviceRepo.find({ where: { user: { id: userId } } })
  }
}
