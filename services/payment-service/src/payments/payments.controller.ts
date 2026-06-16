import { CurrentUser, Roles } from '@grab/nestjs-common'
import type { JwtPayload } from '@grab/types'
import { processPaymentSchema } from '@grab/validators'
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe'
import { CreatePaymentDto, CreatePaymentInput } from './dtos/create-payment.dto'
import { Payment } from './entities/payment.entity'
import { PaymentsService } from './payments.service'

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('customer')
  @ApiOperation({ summary: 'Create a payment (customer)' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: 'Payment created' })
  public createPayment(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(processPaymentSchema)) dto: CreatePaymentInput,
  ): Promise<Payment> {
    return this.paymentsService.createPayment(user.sub, dto)
  }

  @Get(':id')
  @Roles('customer')
  @ApiOperation({ summary: 'Get a payment by id (customer)' })
  @ApiResponse({ status: 200, description: 'The payment' })
  public async getPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Payment> {
    const payment = await this.paymentsService.getPayment(user.sub, id)
    if (!payment) throw new NotFoundException('Payment not found')
    return payment
  }
}
