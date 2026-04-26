import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { randomUUID } from 'crypto'
import type { Repository } from 'typeorm'

import { OrderAggregate } from './domain/order.aggregate'
import type { CreateOrderDto } from './dto/create-order.dto'
import type {
  CancelOrderDto,
  ConfirmOrderDto,
  PickUpOrderDto,
  RefundOrderDto,
} from './dto/update-order-status.dto'
import { EventStoreService } from './event-store/event-store.service'
import { OrderRead } from './projections/entities/order-read.entity'

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(OrderRead) private readonly orderReadRepo: Repository<OrderRead>,
  ) {}

  // ─── Commands ─────────────────────────────────────────────────────────────────

  public async createOrder(customerId: string, dto: CreateOrderDto): Promise<{ orderId: string }> {
    const orderId = randomUUID()

    const items = dto.items.map((item) => ({
      id: randomUUID(),
      orderId,
      menuItemId: item.menuItemId,
      menuItemName: item.menuItemName,
      menuItemImageUrl: undefined,
      quantity: item.quantity,
      variantName: undefined,
      addonNames: [],
      notes: item.notes,
      unitPrice: item.unitPrice,
      totalPrice: item.unitPrice * item.quantity,
    }))

    const aggregate = OrderAggregate.create(
      orderId,
      customerId,
      dto.restaurantId,
      dto.restaurantName,
      items,
      dto.subtotal,
      dto.deliveryFee,
      dto.tax,
      dto.total,
      dto.deliveryAddress,
      dto.notes,
      dto.scheduledFor,
    )

    await this.persistAndEmit(aggregate)
    return { orderId }
  }

  public async confirmOrder(orderId: string, dto: ConfirmOrderDto): Promise<void> {
    const aggregate = await this.loadOrFail(orderId)
    aggregate.confirm(dto.estimatedPrepTimeMinutes)
    await this.persistAndEmit(aggregate)
  }

  public async startPreparing(orderId: string): Promise<void> {
    const aggregate = await this.loadOrFail(orderId)
    aggregate.startPreparing()
    await this.persistAndEmit(aggregate)
  }

  public async markReady(orderId: string): Promise<void> {
    const aggregate = await this.loadOrFail(orderId)
    aggregate.markReady()
    await this.persistAndEmit(aggregate)
  }

  public async pickUp(orderId: string, dto: PickUpOrderDto): Promise<void> {
    const aggregate = await this.loadOrFail(orderId)
    aggregate.pickUp(dto.driverId)
    await this.persistAndEmit(aggregate)
  }

  public async startDelivering(orderId: string): Promise<void> {
    const aggregate = await this.loadOrFail(orderId)
    aggregate.startDelivering()
    await this.persistAndEmit(aggregate)
  }

  public async deliver(orderId: string): Promise<void> {
    const aggregate = await this.loadOrFail(orderId)
    aggregate.deliver()
    await this.persistAndEmit(aggregate)
  }

  public async complete(orderId: string): Promise<void> {
    const aggregate = await this.loadOrFail(orderId)
    aggregate.complete()
    await this.persistAndEmit(aggregate)
  }

  public async cancel(orderId: string, dto: CancelOrderDto): Promise<void> {
    const aggregate = await this.loadOrFail(orderId)
    aggregate.cancel(dto.reason, dto.cancelledBy, dto.note)
    await this.persistAndEmit(aggregate)
  }

  public async refund(orderId: string, dto: RefundOrderDto): Promise<void> {
    const aggregate = await this.loadOrFail(orderId)
    aggregate.refund(dto.amount, dto.reason)
    await this.persistAndEmit(aggregate)
  }

  // ─── Queries ──────────────────────────────────────────────────────────────────

  public async findById(orderId: string): Promise<OrderRead> {
    const order = await this.orderReadRepo.findOne({ where: { id: orderId } })
    if (!order) throw new NotFoundException(`Order ${orderId} not found`)
    return order
  }

  public async findByCustomer(customerId: string): Promise<OrderRead[]> {
    return this.orderReadRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    })
  }

  public async findByRestaurant(restaurantId: string): Promise<OrderRead[]> {
    return this.orderReadRepo.find({
      where: { restaurantId },
      order: { createdAt: 'DESC' },
    })
  }

  /**
   * Find a past order owned by the given customer. Throws ForbiddenException
   * if the order belongs to another user — used by the reorder flow.
   */
  public async findByIdForCustomer(orderId: string, customerId: string): Promise<OrderRead> {
    const order = await this.findById(orderId)
    if (order.customerId !== customerId) {
      throw new NotFoundException(`Order ${orderId} not found`)
    }
    return order
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async loadOrFail(orderId: string): Promise<OrderAggregate> {
    const aggregate = await this.eventStore.load(orderId)
    if (!aggregate) throw new NotFoundException(`Order ${orderId} not found`)
    return aggregate
  }

  private async persistAndEmit(aggregate: OrderAggregate): Promise<void> {
    // Capture before append() clears uncommitted events
    const events = aggregate.getUncommittedEvents()
    await this.eventStore.append(aggregate)

    for (const event of events) {
      const eventName = event.constructor.name.replace('Event', '')
      this.eventEmitter.emit(eventName, event)
      this.logger.debug(`Emitted ${eventName} for order ${aggregate.id}`)
    }
  }
}
