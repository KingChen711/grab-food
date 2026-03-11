// ─── OTP Notification Events ──────────────────────────────────────────────────

export const NOTIFICATION_EVENTS = {
  SEND_OTP_EMAIL: 'notification.send_otp_email',
} as const

export type NotificationAction = 'RESET_PASSWORD' | 'VERIFY_EMAIL'

export class SendOtpEmailEvent {
  constructor(
    public readonly to: string,
    public readonly otp: string,
    public readonly action: NotificationAction,
  ) {}
}
