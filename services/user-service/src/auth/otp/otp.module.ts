import { Module } from '@nestjs/common'

import { TokenBlacklistModule } from '../token-blacklist/token-blacklist.module'
import { OtpService } from './otp.service'
import { OtpNotificationListener } from './otp-notification.listener'

@Module({
  imports: [TokenBlacklistModule],
  providers: [OtpService, OtpNotificationListener],
  exports: [OtpService],
})
export class OtpModule {}
