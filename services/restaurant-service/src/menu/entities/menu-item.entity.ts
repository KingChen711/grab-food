import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { MenuCategory } from './menu-category.entity'
import { MenuItemAddon } from './menu-item-addon.entity'
import { MenuItemVariant } from './menu-item-variant.entity'

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'category_id' })
  public categoryId: string

  @ManyToOne(() => MenuCategory, (c) => c.items, { onDelete: 'CASCADE' })
  public category: MenuCategory

  // Denormalised for direct queries without joining category
  @Column({ name: 'restaurant_id' })
  public restaurantId: string

  @Column({ length: 200 })
  public name: string

  @Column({ type: 'text', nullable: true })
  public description: string | null

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  public imageUrl: string | null

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  public basePrice: number

  @Column({ length: 10, default: 'VND' })
  public currency: string

  @Column({ name: 'is_available', default: true })
  public isAvailable: boolean

  @Column({ name: 'prep_time_minutes', default: 15 })
  public prepTimeMinutes: number

  @Column({ type: 'int', nullable: true })
  public calories: number | null

  @Column({ type: 'simple-array', default: '' })
  public tags: string[]

  // ─── Dietary flags ─────────────────────────────────────────────────────

  @Column({ name: 'is_vegetarian', default: false })
  public isVegetarian: boolean

  @Column({ name: 'is_vegan', default: false })
  public isVegan: boolean

  @Column({ name: 'is_gluten_free', default: false })
  public isGlutenFree: boolean

  @Column({ name: 'is_halal', default: false })
  public isHalal: boolean

  @Column({ name: 'is_spicy', default: false })
  public isSpicy: boolean

  @Column({ name: 'spicy_level', type: 'int', nullable: true })
  public spicyLevel: 1 | 2 | 3 | null

  // ─── Relations ─────────────────────────────────────────────────────────

  @OneToMany(() => MenuItemVariant, (v) => v.item, { cascade: true, eager: true })
  public variants: MenuItemVariant[]

  @OneToMany(() => MenuItemAddon, (a) => a.item, { cascade: true, eager: true })
  public addons: MenuItemAddon[]

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date
}
