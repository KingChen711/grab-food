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
   * Verify a Google Access Token sent from the frontend.
   * Calls Google's userinfo endpoint to retrieve the user's profile.
   */
  public async verifyAccessToken(accessToken: string): Promise<GoogleProfile> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        throw new UnauthorizedException('Invalid or expired Google token')
      }

      const payload = (await res.json()) as { sub?: string; email?: string; name?: string }

      if (!payload.sub) {
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
