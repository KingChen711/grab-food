import type { JwtPayload } from '@grab/types'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import type { User } from '../../users/entities/user.entity'
import type { UsersService } from '../../users/users.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') ?? 'change_me',
    })
  }

  public async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub)
    if (!user) throw new UnauthorizedException()
    if (user.status === 'suspended') throw new UnauthorizedException('Account suspended')
    return user
  }
}
