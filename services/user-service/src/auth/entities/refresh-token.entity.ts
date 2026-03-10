import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { User } from '../../users/entities/user.entity'

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user: User

  @Column({ name: 'token_hash', type: 'varchar' })
  public tokenHash: string

  @Column({
    name: 'family_id',
    type: 'varchar',
    comment: 'Token family for rotation theft detection',
  })
  public familyId: string

  @Column({ name: 'device_info', nullable: true, type: 'varchar' })
  public deviceInfo: string | null

  @Column({ name: 'ip_address', nullable: true, type: 'varchar' })
  public ipAddress: string | null

  @Column({ name: 'expires_at', type: 'timestamptz' })
  public expiresAt: Date

  @Column({ name: 'revoked_at', nullable: true, type: 'timestamptz' })
  public revokedAt: Date | null

  @Column({ name: 'replaced_by_id', nullable: true, type: 'uuid' })
  public replacedById: string | null

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date

  public get isExpired(): boolean {
    return this.expiresAt < new Date()
  }

  public get isRevoked(): boolean {
    return this.revokedAt !== null
  }

  public get isValid(): boolean {
    return !this.isExpired && !this.isRevoked
  }
}
