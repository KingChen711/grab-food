import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

import { bigintTransformer } from '../../common/bigint.transformer'

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'order_id' })
  public orderId: string

  @Column({ name: 'payment_id' })
  public paymentId: string

  @Column({ type: 'bigint', transformer: bigintTransformer })
  public amount: number

  @Column({ type: 'text' })
  public reason: string

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  public status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

  @Column({ name: 'stripe_refund_id', type: 'varchar', nullable: true })
  public stripeRefundId: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date
}
