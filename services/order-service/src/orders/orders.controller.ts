import { CurrentUser } from '@grab/nestjs-common'
import type { JwtPayload } from '@grab/types'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { CreateOrderDto } from './dto/create-order.dto'
import {
  CancelOrderDto,
  ConfirmOrderDto,
  PickUpOrderDto,
  RefundOrderDto,
} from './dto/update-order-status.dto'
import { OrdersService } from './orders.service'
import type { OrderRead } from './projections/entities/order-read.entity'

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── Customer endpoints ───────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ): Promise<{ orderId: string }> {
    return this.ordersService.createOrder(user.sub, dto)
  }

  @Get('my')
  public async myOrders(@CurrentUser() user: JwtPayload): Promise<OrderRead[]> {
    return this.ordersService.findByCustomer(user.sub)
  }

  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrderRead> {
    return this.ordersService.findById(id)
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<void> {
    return this.ordersService.cancel(id, dto)
  }

  // ─── Restaurant endpoints ─────────────────────────────────────────────────────

  @Get('restaurant/:restaurantId')
  public async byRestaurant(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ): Promise<OrderRead[]> {
    return this.ordersService.findByRestaurant(restaurantId)
  }

  @Patch(':id/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmOrderDto,
  ): Promise<void> {
    return this.ordersService.confirmOrder(id, dto)
  }

  @Patch(':id/prepare')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async prepare(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ordersService.startPreparing(id)
  }

  @Patch(':id/ready')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async ready(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ordersService.markReady(id)
  }

  // ─── Driver endpoints ─────────────────────────────────────────────────────────

  @Patch(':id/pickup')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async pickUp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PickUpOrderDto,
  ): Promise<void> {
    return this.ordersService.pickUp(id, dto)
  }

  @Patch(':id/delivering')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async startDelivering(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ordersService.startDelivering(id)
  }

  @Patch(':id/deliver')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deliver(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ordersService.deliver(id)
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async complete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ordersService.complete(id)
  }

  // ─── System endpoints ─────────────────────────────────────────────────────────

  @Patch(':id/refund')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundOrderDto,
  ): Promise<void> {
    return this.ordersService.refund(id, dto)
  }
}
