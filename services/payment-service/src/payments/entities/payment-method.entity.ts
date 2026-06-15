import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('saved_payment_methods')
export class SavedPaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'user_id' })
  public userId: string

  @Column({ type: 'varchar', length: 20 })
  public type: 'card'

  @Column({ name: 'stripe_payment_method_id' })
  public stripePaymentMethodId: string

  @Column({ type: 'varchar', length: 50 })
  public brand: string

  @Column({ type: 'varchar', length: 4 })
  public last4: string

  @Column({ name: 'exp_month', type: 'int' })
  public expMonth: number

  @Column({ name: 'exp_year', type: 'int' })
  public expYear: number

  @Column({ name: 'is_default', type: 'boolean' })
  public isDefault: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date
}
