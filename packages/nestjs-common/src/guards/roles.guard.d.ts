import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
export declare class RolesGuard implements CanActivate {
  private readonly reflector
  constructor(reflector: Reflector)
  canActivate(context: ExecutionContext): boolean
}
//# sourceMappingURL=roles.guard.d.ts.map
