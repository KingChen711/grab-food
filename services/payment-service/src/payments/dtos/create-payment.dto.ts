import { PAYMENT_METHODS, type PaymentMethod } from '@grab/types'
import type { ProcessPaymentInput } from '@grab/validators'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Documentation-only shape for Swagger. The actual runtime validation is done by
 * `processPaymentSchema` (Zod) via `ZodValidationPipe` — see PaymentsController.
 * Handlers receive the inferred {@link CreatePaymentInput} type, not this class,
 * so the global class-validator pipe leaves the body alone.
 */
export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid', description: 'Order being paid for' })
  public orderId: string

  @ApiProperty({ example: 220_000, description: 'Amount in VND (integer, zero-decimal)' })
  public amount: number

  @ApiProperty({ enum: ['VND', 'USD'], default: 'VND' })
  public currency: 'VND' | 'USD'

  @ApiProperty({ enum: PAYMENT_METHODS, description: 'How the order is paid' })
  public method: PaymentMethod

  @ApiProperty({
    required: false,
    format: 'uuid',
    description: 'Saved card to charge (required when method is "card" off-session)',
  })
  public paymentMethodId?: string

  @ApiProperty({
    minLength: 10,
    maxLength: 100,
    example: 'order:00000000-0000-0000-0000-000000000001',
    description: 'Client-supplied key so retries do not double-charge',
  })
  public idempotencyKey: string
}

/** The validated, parsed body a handler actually receives. */
export type CreatePaymentInput = ProcessPaymentInput
