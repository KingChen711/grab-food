import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { Stripe as TStripe } from 'stripe/cjs/stripe.core'

interface CreatePaymentIntentParams {
  amount: number
  currency?: string
  customerId?: string
  paymentMethodId?: string
  metadata?: Record<string, string>
  captureMethod?: TStripe.PaymentIntentCreateParams.CaptureMethod
}

@Injectable()
export class StripeService {
  private readonly stripe: TStripe
  private readonly webhookSecret: string

  constructor(config: ConfigService) {
    this.stripe = new Stripe(config.getOrThrow('stripe.secretKey'))
    this.webhookSecret = config.getOrThrow<string>('stripe.webhookSecret')
  }

  public async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<TStripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency ?? 'vnd',
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      metadata: params.metadata,
      capture_method: params.captureMethod,
      automatic_payment_methods: {
        enabled: true,
      },
    })
  }

  public createSetupIntent(customerId: string): Promise<TStripe.SetupIntent> {
    return this.stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      usage: 'off_session',
    })
  }

  public async refund(paymentIntentId: string, amount?: number): Promise<TStripe.Refund> {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
    })
  }

  public constructWebhookEvent(rawBody: Buffer, signature: string): TStripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret)
  }
}
