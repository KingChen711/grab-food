import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { User } from './user.entity'

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  public user: User

  @Column({ name: 'full_name' })
  public fullName: string

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar' })
  public avatarUrl: string | null

  @Column({ name: 'date_of_birth', nullable: true, type: 'date' })
  public dateOfBirth: string | null

  @Column({ nullable: true, type: 'varchar', length: 500 })
  public bio: string | null

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date
}
