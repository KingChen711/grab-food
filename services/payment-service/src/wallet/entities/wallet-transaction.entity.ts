import { WalletTransactionType } from '@grab/types'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

import { bigintTransformer } from '../../common/bigint.transformer'
import { Wallet } from './wallet.entity'

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Index()
  @Column({ name: 'wallet_id', type: 'uuid' })
  public walletId: string

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' }) // ← same name as the @Column
  public wallet!: Wallet

  @Column({ type: 'varchar', length: 30 })
  public type: WalletTransactionType

  @Column({ type: 'bigint', transformer: bigintTransformer })
  public amount: number

  @Column({ name: 'balance_before', type: 'bigint', transformer: bigintTransformer })
  public balanceBefore: number

  @Column({ name: 'balance_after', type: 'bigint', transformer: bigintTransformer })
  public balanceAfter: number

  @Column({ type: 'text' })
  public description: string

  @Column({ name: 'reference_id', nullable: true, type: 'varchar' })
  public referenceId: string | null

  @Column({ name: 'reference_type', nullable: true, type: 'varchar' })
  public referenceType: 'order' | 'topup' | 'refund' | 'payout' | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date
}
