import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { MenuItem } from './menu-item.entity'

@Entity('menu_item_addons')
export class MenuItemAddon {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'item_id' })
  public itemId: string

  @ManyToOne(() => MenuItem, (item) => item.addons, { onDelete: 'CASCADE' })
  public item: MenuItem

  @Column({ length: 100 })
  public name: string

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  public price: number

  @Column({ name: 'max_quantity', default: 1 })
  public maxQuantity: number

  @Column({ name: 'is_required', default: false })
  public isRequired: boolean
}
