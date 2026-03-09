import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  public getStatus(): { status: string; service: string } {
    return { status: 'ok', service: 'search-service' }
  }
}
