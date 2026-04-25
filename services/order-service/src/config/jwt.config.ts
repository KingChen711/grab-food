import { registerAs } from '@nestjs/config'

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change_me_access',
}))
