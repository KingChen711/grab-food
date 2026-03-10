import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { User } from './user.entity'

@Entity('user_devices')
export class UserDevice {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @ManyToOne(() => User, (user) => user.devices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user: User

  @Column({ name: 'device_token', type: 'varchar' })
  public deviceToken: string

  @Column({ type: 'enum', enum: ['ios', 'android', 'web'] })
  public platform: 'ios' | 'android' | 'web'

  @Column({ name: 'device_name', nullable: true, type: 'varchar' })
  public deviceName: string | null

  @UpdateDateColumn({ name: 'last_active_at' })
  public lastActiveAt: Date
}
