import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { User } from './user.entity'

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user: User

  @Column({ type: 'varchar', length: 100, nullable: true })
  public label: string | null

  @Column({ name: 'full_address', type: 'varchar', length: 500 })
  public fullAddress: string

  @Column({ nullable: true, type: 'varchar', length: 200 })
  public street: string | null

  @Column({ nullable: true, type: 'varchar', length: 100 })
  public district: string | null

  @Column({ type: 'varchar', length: 100 })
  public city: string

  @Column({ type: 'varchar', length: 100, default: 'Vietnam' })
  public country: string

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  public lat: number

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  public lng: number

  @Column({ name: 'is_default', default: false })
  public isDefault: boolean

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date
}
