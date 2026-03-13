import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { Restaurant } from '../../restaurants/entities/restaurant.entity'

@Entity('restaurant_reviews')
export class RestaurantReview {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'restaurant_id' })
  public restaurantId: string

  @ManyToOne(() => Restaurant, (r) => r.reviews, { onDelete: 'CASCADE' })
  public restaurant: Restaurant

  // Cross-service references — no FK constraint
  @Column({ name: 'user_id' })
  public userId: string

  @Column({ name: 'order_id' })
  public orderId: string

  @Column({ type: 'int' })
  public rating: 1 | 2 | 3 | 4 | 5

  @Column({ type: 'text', nullable: true })
  public comment: string | null

  @Column({ type: 'simple-array', nullable: true })
  public images: string[] | null

  @Column({ name: 'owner_reply', type: 'text', nullable: true })
  public ownerReply: string | null

  @Column({ name: 'owner_replied_at', type: 'timestamptz', nullable: true })
  public ownerRepliedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date
}
