import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import type { SendOtpEmailEvent } from '../events/notification.events';
import { NOTIFICATION_EVENTS } from '../events/notification.events'

/**
 * Phase 1 mock listener — logs OTPs to the console.
 * In Phase 5, replace the @OnEvent handler body with a message publish to
 * RabbitMQ/Kafka → Notification Service.
 */
@Injectable()
export class OtpNotificationListener {
  private readonly logger = new Logger(OtpNotificationListener.name)

  @OnEvent(NOTIFICATION_EVENTS.SEND_OTP_EMAIL)
  public handleSendOtpEmail(event: SendOtpEmailEvent): void {
    // TODO Phase 5: publish to RabbitMQ/Kafka → notification-service
    this.logger.log(`[MOCK EMAIL] To: ${event.to} | Action: ${event.action} | OTP: ${event.otp}`)
  }
}
