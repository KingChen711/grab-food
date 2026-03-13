import type { DayOfWeek } from '@grab/types'
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { Restaurant } from './restaurant.entity'

@Entity('operating_hours')
export class OperatingHours {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ name: 'restaurant_id' })
  public restaurantId: string

  @ManyToOne(() => Restaurant, (r) => r.operatingHours, { onDelete: 'CASCADE' })
  public restaurant: Restaurant

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  })
  public dayOfWeek: DayOfWeek

  @Column({ name: 'open_time', length: 5, default: '09:00' })
  public openTime: string

  @Column({ name: 'close_time', length: 5, default: '22:00' })
  public closeTime: string

  @Column({ name: 'is_closed', default: false })
  public isClosed: boolean
}
