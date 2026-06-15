import { registerAs } from '@nestjs/config'

export const databaseConfig = registerAs('database', () => ({
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'grab_user',
  password: process.env.POSTGRES_PASSWORD ?? 'grab_password',
  database: process.env.PAYMENT_SERVICE_DB ?? 'grab_payments',
}))
