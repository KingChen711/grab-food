import { Currency, InvoiceItem } from '@grab/types'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'user_id' })
  public userId: string

  @Column({ name: 'order_id' })
  public orderId: string

  @Column({ type: 'jsonb', default: [] })
  public items: InvoiceItem[]

  @Column({ type: 'int' })
  public subtotal: number

  @Column({ name: 'delivery_fee', type: 'int' })
  public deliveryFee: number

  @Column({ type: 'int' })
  public tax: number

  @Column({ type: 'int' })
  public discount: number

  @Column({ type: 'int' })
  public total: number

  @Column({ type: 'varchar', length: 10 })
  public currency: Currency

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  public pdfUrl: string | null

  @Column({ name: 'issued_at', type: 'timestamptz' })
  public issuedAt: Date
}
