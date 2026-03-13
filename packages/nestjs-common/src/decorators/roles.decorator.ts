import type { UserRole } from '@grab/types'
import type { CustomDecorator } from '@nestjs/common'
import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

export const Roles = (...roles: UserRole[]): CustomDecorator => SetMetadata(ROLES_KEY, roles)
