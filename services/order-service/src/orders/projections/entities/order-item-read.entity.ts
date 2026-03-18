import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { OrderRead } from './order-read.entity'

@Entity('order_items_read')
export class OrderItemRead {
  @PrimaryGeneratedColumn('uuid')
  public id!: string

  @ManyToOne(() => OrderRead, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  public order!: OrderRead

  @Column('uuid')
  public orderId!: string

  @Column('uuid')
  public menuItemId!: string

  @Column()
  public menuItemName!: string

  @Column('decimal', { precision: 10, scale: 2 })
  public unitPrice!: number

  @Column('int')
  public quantity!: number

  @Column({ nullable: true })
  public notes?: string

  @Column('jsonb', { nullable: true })
  public customizations?: Record<string, unknown>
}
