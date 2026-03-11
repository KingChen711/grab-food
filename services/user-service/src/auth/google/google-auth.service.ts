import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'

export interface GoogleProfile {
  googleId: string
  email: string | null
  name: string | null
}

@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('google.clientId')
    this.client = new OAuth2Client(clientId)
  }

  /**
   * Verify a Google ID Token sent from the frontend.
   * Returns the user's Google profile extracted from the token payload.
   */
  public async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('google.clientId'),
      })

      const payload = ticket.getPayload()
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Invalid Google token payload')
      }

      return {
        googleId: payload.sub,
        email: payload.email ?? null,
        name: payload.name ?? null,
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired Google token')
    }
  }
}
