import { Currency } from '@grab/types'
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

import { bigintTransformer } from '../../common/bigint.transformer'
import { WalletTransaction } from './wallet-transaction.entity'

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'user_id' })
  public userId: string

  @Column({ type: 'bigint', transformer: bigintTransformer })
  public balance: number

  @Column({ type: 'varchar', length: 10 })
  public currency: Currency

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt: Date

  @OneToMany(() => WalletTransaction, (a) => a.wallet, { cascade: true })
  public transactions: WalletTransaction[]
}
