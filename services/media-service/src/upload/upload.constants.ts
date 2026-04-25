export const IMAGE_PROCESSING_QUEUE = 'media-image'

// ─── Content Moderation Limits ───────────────────────────────────────────────
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_IMAGE_DIMENSION = 8000 // px (width or height)
export const MIN_IMAGE_DIMENSION = 32 // px (width or height)
export const ALLOWED_IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif'] as const
