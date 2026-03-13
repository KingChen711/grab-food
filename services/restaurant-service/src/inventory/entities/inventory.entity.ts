import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'item_id', unique: true })
  public itemId: string

  @Column({ name: 'restaurant_id' })
  public restaurantId: string

  @Column({ default: 0 })
  public quantity: number

  @Column({ name: 'low_stock_threshold', default: 5 })
  public lowStockThreshold: number

  @Column({ name: 'is_tracked', default: false })
  public isTracked: boolean

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date
}
