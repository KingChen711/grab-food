import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { MenuItem } from './menu-item.entity'

@Entity('menu_item_variants')
export class MenuItemVariant {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'item_id' })
  public itemId: string

  @ManyToOne(() => MenuItem, (item) => item.variants, { onDelete: 'CASCADE' })
  public item: MenuItem

  @Column({ length: 100 })
  public name: string

  @Column({ name: 'price_adjustment', type: 'decimal', precision: 10, scale: 2, default: 0 })
  public priceAdjustment: number

  @Column({ name: 'is_default', default: false })
  public isDefault: boolean
}
