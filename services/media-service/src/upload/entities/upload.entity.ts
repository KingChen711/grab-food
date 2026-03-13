import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

import type { UploadContext, UploadStatus } from '../upload.types'

@Entity('uploads')
export class UploadEntity {
  @PrimaryColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 50 })
  context: UploadContext

  @Column({ type: 'varchar', nullable: true })
  entityId: string | null

  /** MinIO object key of the raw uploaded file */
  @Column({ type: 'varchar' })
  originalKey: string

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: UploadStatus

  // Processed variant keys — null until processing completes
  @Column({ type: 'varchar', nullable: true })
  thumbnailKey: string | null

  @Column({ type: 'varchar', nullable: true })
  mediumKey: string | null

  @Column({ type: 'varchar', nullable: true })
  fullKey: string | null

  @Column({ type: 'varchar', nullable: true })
  errorMessage: string | null

  /** Set when the caller retrieves the URLs for permanent storage (triggers row deletion) */
  @Column({ type: 'timestamptz', nullable: true })
  claimedAt: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
