import { registerAs } from '@nestjs/config'

export const rabbitmqConfig = registerAs('rabbitmq', () => ({
  url: process.env.RABBITMQ_URL ?? 'amqp://grab_user:grab_password@localhost:5672/grab',
}))
