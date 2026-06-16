import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { IdempotencyModule } from '../idempotency/idempotency.module'
import { StripeModule } from '../stripe/stripe.module'
import { Payment } from './entities/payment.entity'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), IdempotencyModule, StripeModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentModule {}
