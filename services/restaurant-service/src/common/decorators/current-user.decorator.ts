import type { JwtPayload } from '@grab/types'
import type { ExecutionContext } from '@nestjs/common'
import { createParamDecorator } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>()
    return request.user
  },
)
