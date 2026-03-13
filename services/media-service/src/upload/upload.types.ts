export type UploadContext =
  | 'restaurant_cover'
  | 'restaurant_logo'
  | 'menu_item'
  | 'avatar'
  | 'delivery_proof'

export type UploadStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export interface UploadRecord {
  id: string
  context: UploadContext
  entityId: string | null
  /** MinIO object key of the raw uploaded file */
  originalKey: string
  status: UploadStatus
  urls: {
    thumbnail: string | null // 150px wide, WebP
    medium: string | null // 600px wide, WebP
    full: string | null // 1200px wide, WebP
  }
  error: string | null
  createdAt: string
}
