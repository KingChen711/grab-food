import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import { Restaurant } from '../../restaurants/entities/restaurant.entity'
import { MenuItem } from './menu-item.entity'

@Entity('menu_categories')
export class MenuCategory {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'restaurant_id' })
  public restaurantId: string

  @ManyToOne(() => Restaurant, (r) => r.categories, { onDelete: 'CASCADE' })
  public restaurant: Restaurant

  @Column({ length: 100 })
  public name: string

  @Column({ type: 'text', nullable: true })
  public description: string | null

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  public imageUrl: string | null

  @Column({ name: 'sort_order', default: 0 })
  public sortOrder: number

  @Column({ name: 'is_active', default: true })
  public isActive: boolean

  @OneToMany(() => MenuItem, (item) => item.category, { cascade: true })
  public items: MenuItem[]
}
