import type { JwtPayload } from '@grab/types'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import type { User } from '../../users/entities/user.entity'
import type { UsersService } from '../../users/users.service'
import type { TokenBlacklistService } from '../token-blacklist/token-blacklist.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') ?? 'change_me',
    })
  }

  public async validate(payload: JwtPayload): Promise<User> {
    // Check if the specific token is blacklisted
    if (payload.jti) {
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(payload.jti)
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked')
      }
    }

    // Check if the user has revoked all tokens issued before this token
    const isUserRevoked = await this.tokenBlacklistService.isUserRevokedBefore(
      payload.sub,
      payload.iat,
    )
    if (isUserRevoked) {
      throw new UnauthorizedException('Token has been revoked by user logout')
    }

    const user = await this.usersService.findById(payload.sub)
    if (!user) throw new UnauthorizedException()
    if (user.status === 'suspended') throw new UnauthorizedException('Account suspended')
    return user
  }
}
