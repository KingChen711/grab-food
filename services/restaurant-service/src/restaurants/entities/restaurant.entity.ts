import type { PriceRange, RestaurantStatus } from '@grab/types'
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { MenuCategory } from '../../menu/entities/menu-category.entity'
import { RestaurantReview } from '../../reviews/entities/restaurant-review.entity'
import { OperatingHours } from './operating-hours.entity'

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  // Reference to user-service owner — no FK constraint across services
  @Column({ name: 'owner_id' })
  public ownerId: string

  @Column({ length: 200 })
  public name: string

  @Column({ unique: true, length: 220 })
  public slug: string

  @Column({ type: 'text', nullable: true })
  public description: string | null

  @Column({ name: 'cover_image_url', type: 'varchar', nullable: true })
  public coverImageUrl: string | null

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  public logoUrl: string | null

  // ─── Location ─────────────────────────────────────────────────────────────

  @Column({ name: 'full_address' })
  public fullAddress: string

  @Column()
  public city: string

  @Column()
  public country: string

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  public lat: number

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  public lng: number

  // ─── Contact & Meta ───────────────────────────────────────────────────────

  @Column()
  public phone: string

  @Column({ name: 'cuisine_types', type: 'simple-array' })
  public cuisineTypes: string[]

  @Column({ name: 'price_range', type: 'int', default: 1 })
  public priceRange: PriceRange

  // ─── Status ───────────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'active', 'suspended', 'closed'],
    default: 'pending',
  })
  public status: RestaurantStatus

  @Column({ name: 'is_open', default: false })
  public isOpen: boolean

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  public approvedAt: Date | null

  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  public approvedBy: string | null

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  public rejectionReason: string | null

  // ─── Metrics ──────────────────────────────────────────────────────────────

  @Column({
    name: 'avg_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  public avgRating: number

  @Column({ name: 'total_reviews', default: 0 })
  public totalReviews: number

  @Column({ name: 'total_orders', default: 0 })
  public totalOrders: number

  @Column({ name: 'avg_prep_time_minutes', default: 20 })
  public avgPrepTimeMinutes: number

  @Column({
    name: 'min_order_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  public minOrderAmount: number

  @Column({
    name: 'delivery_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  public deliveryFee: number

  // ─── Relations ────────────────────────────────────────────────────────────

  @OneToMany(() => OperatingHours, (oh) => oh.restaurant, { cascade: true, eager: true })
  public operatingHours: OperatingHours[]

  @OneToMany(() => MenuCategory, (c) => c.restaurant)
  public categories: MenuCategory[]

  @OneToMany(() => RestaurantReview, (r) => r.restaurant)
  public reviews: RestaurantReview[]

  // ─── Timestamps ───────────────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date
}
