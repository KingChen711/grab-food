import type { JwtPayload } from '@grab/types'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') ?? 'change_me_access',
    })
  }

  // Stateless validation — signature already verified by Passport.
  // We trust the payload; blacklist checking is user-service's responsibility.
  public validate(payload: JwtPayload): JwtPayload {
    return payload
  }
}
