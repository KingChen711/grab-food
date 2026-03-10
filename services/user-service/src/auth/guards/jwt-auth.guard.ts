import type { ExecutionContext } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import type { Observable } from 'rxjs'

export const IS_PUBLIC_KEY = 'isPublic'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  public override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true
    return super.canActivate(context)
  }
}
