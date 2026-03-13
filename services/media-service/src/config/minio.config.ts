import { registerAs } from '@nestjs/config'

export const minioConfig = registerAs('minio', () => ({
  endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  bucket: process.env.MINIO_BUCKET ?? 'grab-media',
  // In production: CloudFront or MinIO public endpoint
  cdnBaseUrl: process.env.CDN_BASE_URL ?? 'http://localhost:9000/grab-media',
}))
