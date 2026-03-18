import type { CancellationReason, OrderStatus } from '@grab/types'
import { Column, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm'

import { OrderItemRead } from './order-item-read.entity'
import { OrderTimeline } from './order-timeline.entity'

@Entity('orders_read')
export class OrderRead {
  @PrimaryColumn('uuid')
  public id!: string

  @Column('uuid')
  public customerId!: string

  @Column('uuid')
  public restaurantId!: string

  @Column()
  public restaurantName!: string

  @Column('uuid', { nullable: true })
  public driverId?: string

  @Column({ type: 'varchar' })
  public status!: OrderStatus

  @Column('decimal', { precision: 10, scale: 2 })
  public subtotal!: number

  @Column('decimal', { precision: 10, scale: 2 })
  public deliveryFee!: number

  @Column('decimal', { precision: 10, scale: 2 })
  public tax!: number

  @Column('decimal', { precision: 10, scale: 2 })
  public total!: number

  @Column('jsonb')
  public deliveryAddress!: Record<string, unknown>

  @Column({ nullable: true })
  public notes?: string

  @Column('int', { nullable: true })
  public estimatedPrepTimeMinutes?: number

  @Column({ type: 'varchar', nullable: true })
  public cancellationReason?: CancellationReason

  @Column({ nullable: true })
  public cancellationNote?: string

  @Column({ nullable: true })
  public scheduledFor?: Date

  @Column({ nullable: true })
  public completedAt?: Date

  @Column('int', { default: 0 })
  public version!: number

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt!: Date

  @UpdateDateColumn()
  public updatedAt!: Date

  @OneToMany(() => OrderItemRead, (item) => item.order, { cascade: true, eager: true })
  public items!: OrderItemRead[]

  @OneToMany(() => OrderTimeline, (tl) => tl.order, { cascade: true })
  public timeline!: OrderTimeline[]
}
