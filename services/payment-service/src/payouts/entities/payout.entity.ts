import { Currency, PayoutStatus } from '@grab/types'
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

import { bigintTransformer } from '../../common/bigint.transformer'

@Entity('payouts')
@Index(['recipientId', 'periodStart'])
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'recipient_id' })
  public recipientId: string

  @Column({ name: 'recipient_type' })
  public recipientType: 'restaurant' | 'driver'

  @Column({ type: 'bigint', transformer: bigintTransformer })
  public amount: number

  @Column({ type: 'varchar', length: 10 })
  public currency: Currency

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  public status: PayoutStatus

  @Column({ name: 'stripe_transfer_id', type: 'varchar', nullable: true })
  public stripeTransferId: string | null

  @Column({ name: 'period_start', type: 'timestamptz' })
  public periodStart: Date

  @Column({ name: 'period_end', type: 'timestamptz' })
  public periodEnd: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date
}
