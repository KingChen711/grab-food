import type { UserRole, UserStatus } from '@grab/types'
import { Exclude } from 'class-transformer'
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { RefreshToken } from '../../auth/entities/refresh-token.entity'
import { UserAddress } from './user-address.entity'
import { UserDevice } from './user-device.entity'
import { UserProfile } from './user-profile.entity'

@Entity('users')
@Check(`"email" IS NOT NULL OR "phone" IS NOT NULL`)
export class User {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ unique: true, nullable: true, type: 'varchar' })
  public email: string | null

  @Column({ unique: true, nullable: true, type: 'varchar' })
  public phone: string | null

  @Exclude()
  @Column({ name: 'password_hash', nullable: true, type: 'varchar', select: false })
  public passwordHash: string | null

  @Column({
    type: 'enum',
    enum: ['customer', 'driver', 'restaurant_owner', 'admin'],
    default: 'customer',
  })
  public role: UserRole

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'pending_verification',
  })
  public status: UserStatus

  @Column({ name: 'is_email_verified', default: false })
  public isEmailVerified: boolean

  @Column({ name: 'is_phone_verified', default: false })
  public isPhoneVerified: boolean

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true, eager: true })
  public profile: UserProfile

  @OneToMany(() => UserAddress, (address) => address.user, { cascade: true })
  public addresses: UserAddress[]

  @OneToMany(() => UserDevice, (device) => device.user, { cascade: true })
  public devices: UserDevice[]

  @OneToMany(() => RefreshToken, (token) => token.user, { cascade: true })
  public refreshTokens: RefreshToken[]

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date
}
