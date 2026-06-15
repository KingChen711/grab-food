import { Currency, PaymentMethod, PaymentStatus } from '@grab/types'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { bigintTransformer } from '../../common/bigint.transformer'

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Index()
  @Column({ name: 'order_id' })
  public orderId: string

  @Column({ name: 'user_id' })
  public userId: string

  @Column({ type: 'bigint', transformer: bigintTransformer })
  public amount: number

  @Column({ type: 'varchar', length: 10 })
  public currency: Currency

  @Column({ type: 'varchar', length: 50 })
  public method: PaymentMethod

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  public status: PaymentStatus

  @Column({ name: 'stripe_payment_intent_id', type: 'text', nullable: true })
  public stripePaymentIntentId: string | null

  @Index({ unique: true })
  @Column({ name: 'idempotency_key', type: 'text' })
  public idempotencyKey: string

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  public failureReason: string | null

  @Column({ type: 'jsonb', nullable: true })
  public metadata?: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt: Date
}
