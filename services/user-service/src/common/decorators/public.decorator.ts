import type { CustomDecorator } from '@nestjs/common'
import { SetMetadata } from '@nestjs/common'

import { IS_PUBLIC_KEY } from '../../auth/guards/jwt-auth.guard'

export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC_KEY, true)
