import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

import type { UploadContext, UploadStatus } from '../upload.types'

@Entity('uploads')
export class UploadEntity {
  @PrimaryColumn('uuid')
  public id: string

  @Column({ type: 'varchar', length: 50 })
  public context: UploadContext

  @Column({ type: 'varchar', nullable: true })
  public entityId: string | null

  /** MinIO object key of the raw uploaded file */
  @Column({ type: 'varchar' })
  public originalKey: string

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  public status: UploadStatus

  // Processed variant keys — null until processing completes
  @Column({ type: 'varchar', nullable: true })
  public thumbnailKey: string | null

  @Column({ type: 'varchar', nullable: true })
  public mediumKey: string | null

  @Column({ type: 'varchar', nullable: true })
  public fullKey: string | null

  @Column({ type: 'varchar', nullable: true })
  public errorMessage: string | null

  /** Set when the caller retrieves the URLs for permanent storage (triggers row deletion) */
  @Column({ type: 'timestamptz', nullable: true })
  public claimedAt: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  public updatedAt: Date
}
