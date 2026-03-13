import type { JwtPayload, UserRole } from '@grab/types'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Inject, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { ROLES_KEY } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>()
    return required.includes(request.user?.role)
  }
}
