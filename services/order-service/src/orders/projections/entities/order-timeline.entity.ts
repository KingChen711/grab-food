import type { OrderStatus } from '@grab/types'
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { OrderRead } from './order-read.entity'

@Entity('order_timeline')
export class OrderTimeline {
  @PrimaryGeneratedColumn('uuid')
  public id!: string

  @ManyToOne(() => OrderRead, (order) => order.timeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  public order!: OrderRead

  @Column('uuid')
  public orderId!: string

  @Column({ type: 'varchar' })
  public status!: OrderStatus

  @Column({ type: 'timestamp' })
  public occurredOn!: Date

  @Column({ nullable: true })
  public note?: string
}
