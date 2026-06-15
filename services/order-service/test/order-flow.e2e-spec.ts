/**
 * Order flow integration test — Event Sourcing + CQRS projection round-trip
 * against real MongoDB (event store) and PostgreSQL (read model).
 *
 * Requires infrastructure to be running:
 *   docker compose -f infrastructure/docker/docker-compose.infra.yml up -d postgres mongodb
 *
 * Run with: pnpm --filter @grab/order-service test:e2e
 */
import type { INestApplication } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { getModelToken, MongooseModule } from '@nestjs/mongoose'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm'
import type { Model } from 'mongoose'
import type { Repository } from 'typeorm'

import type { CreateOrderDto } from '../src/orders/dto/create-order.dto'
import { EventStoreService } from '../src/orders/event-store/event-store.service'
import { Snapshot, SnapshotSchema } from '../src/orders/event-store/schemas/snapshot.schema'
import {
  StoredEvent,
  StoredEventSchema,
} from '../src/orders/event-store/schemas/stored-event.schema'
import { OrdersService } from '../src/orders/orders.service'
import { OrderItemRead } from '../src/orders/projections/entities/order-item-read.entity'
import { OrderRead } from '../src/orders/projections/entities/order-read.entity'
import { OrderTimeline } from '../src/orders/projections/entities/order-timeline.entity'
import { OrderReadProjection } from '../src/orders/projections/order-read.projection'

const PG = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'grab_user',
  password: process.env.POSTGRES_PASSWORD ?? 'grab_password',
  database: process.env.ORDER_SERVICE_DB ?? 'grab_orders',
}
const MONGO_URI =
  process.env.MONGO_TEST_URI ??
  'mongodb://grab_user:grab_password@localhost:27017/grab_orders_e2e?authSource=admin'

/** Poll until `fn` returns a truthy value (the projection runs async, off the emit). */
async function waitFor<T>(fn: () => Promise<T | null | undefined>, timeoutMs = 5000): Promise<T> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const result = await fn()
    if (result) return result
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error('waitFor: condition not met within timeout')
}

function makeOrderDto(): CreateOrderDto {
  return {
    restaurantId: '00000000-0000-0000-0000-0000000000aa',
    restaurantName: 'Pizza Palace',
    items: [
      {
        menuItemId: '00000000-0000-0000-0000-0000000000bb',
        menuItemName: 'Margherita',
        unitPrice: 100_000,
        quantity: 2,
      },
    ],
    subtotal: 200_000,
    deliveryFee: 15_000,
    tax: 5_000,
    total: 220_000,
    deliveryAddress: { address: '1 Le Loi', lat: 10.77, lng: 106.7 },
  }
}

describe('Order flow (e2e — Event Sourcing + CQRS)', () => {
  let app: INestApplication
  let ordersService: OrdersService
  let eventStore: EventStoreService
  let orderReadRepo: Repository<OrderRead>
  let timelineRepo: Repository<OrderTimeline>
  let eventModel: Model<StoredEvent>
  let snapshotModel: Model<Snapshot>

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        MongooseModule.forRoot(MONGO_URI),
        MongooseModule.forFeature([
          { name: StoredEvent.name, schema: StoredEventSchema },
          { name: Snapshot.name, schema: SnapshotSchema },
        ]),
        TypeOrmModule.forRoot({
          type: 'postgres',
          ...PG,
          entities: [OrderRead, OrderItemRead, OrderTimeline],
          synchronize: true,
          dropSchema: true, // clean slate for the read model each run
        }),
        TypeOrmModule.forFeature([OrderRead, OrderItemRead, OrderTimeline]),
      ],
      providers: [OrdersService, EventStoreService, OrderReadProjection],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    ordersService = app.get(OrdersService)
    eventStore = app.get(EventStoreService)
    orderReadRepo = app.get(getRepositoryToken(OrderRead))
    timelineRepo = app.get(getRepositoryToken(OrderTimeline))
    eventModel = app.get(getModelToken(StoredEvent.name))
    snapshotModel = app.get(getModelToken(Snapshot.name))

    // Mongo collections persist across runs — clear the event store up front.
    await eventModel.deleteMany({})
    await snapshotModel.deleteMany({})
  }, 30_000)

  afterAll(async () => {
    // The CQRS projection runs async off the event emit; let in-flight writes
    // drain before we tear down the connection pool to avoid noisy teardown errors.
    await new Promise((r) => setTimeout(r, 300))
    await app?.close()
  })

  it('persists an OrderCreated event and projects a CREATED read model with items + timeline', async () => {
    const { orderId } = await ordersService.createOrder(
      '11111111-1111-1111-1111-111111111111',
      makeOrderDto(),
    )

    // ── Write side: event is durably stored in MongoDB ──
    const events = await eventStore.loadEvents(orderId)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ eventType: 'OrderCreated', version: 1 })

    // ── Write side: aggregate rebuilds from the stream ──
    const aggregate = await eventStore.load(orderId)
    expect(aggregate).not.toBeNull()
    expect(aggregate!.status).toBe('CREATED')
    expect(aggregate!.total).toBe(220_000)

    // ── Read side: CQRS projection lands in PostgreSQL ──
    const read = await waitFor(() =>
      orderReadRepo.findOne({ where: { id: orderId }, relations: ['items'] }),
    )
    expect(read.status).toBe('CREATED')
    expect(Number(read.total)).toBe(220_000)
    expect(read.items).toHaveLength(1)
    expect(read.items[0].menuItemName).toBe('Margherita')

    const timeline = await timelineRepo.find({ where: { orderId } })
    expect(timeline.map((t) => t.status)).toContain('CREATED')
  })

  it('appends OrderConfirmed and the projection advances to CONFIRMED', async () => {
    const { orderId } = await ordersService.createOrder(
      '22222222-2222-2222-2222-222222222222',
      makeOrderDto(),
    )
    await waitFor(() => orderReadRepo.findOne({ where: { id: orderId } }))

    await ordersService.confirmOrder(orderId, { estimatedPrepTimeMinutes: 20 })

    // Write side: a second event now exists and the aggregate is CONFIRMED at v2
    const aggregate = await eventStore.load(orderId)
    expect(aggregate!.status).toBe('CONFIRMED')
    expect(aggregate!.version).toBe(2)
    expect(aggregate!.estimatedPrepTimeMinutes).toBe(20)

    // Read side: projection reflects the new status + prep time
    const read = await waitFor(async () => {
      const row = await orderReadRepo.findOne({ where: { id: orderId } })
      return row?.status === 'CONFIRMED' ? row : null
    })
    expect(read.estimatedPrepTimeMinutes).toBe(20)

    const timeline = await timelineRepo.find({ where: { orderId } })
    expect(timeline.map((t) => t.status)).toEqual(expect.arrayContaining(['CREATED', 'CONFIRMED']))
  })

  it('rejects an illegal state transition (confirm after cancel)', async () => {
    const { orderId } = await ordersService.createOrder(
      '33333333-3333-3333-3333-333333333333',
      makeOrderDto(),
    )
    await ordersService.cancel(orderId, { reason: 'customer_request', cancelledBy: 'customer' })

    await expect(
      ordersService.confirmOrder(orderId, { estimatedPrepTimeMinutes: 15 }),
    ).rejects.toThrow()

    const aggregate = await eventStore.load(orderId)
    expect(aggregate!.status).toBe('CANCELLED')

    // Let the projection settle on CANCELLED so teardown has nothing in flight.
    const read = await waitFor(async () => {
      const row = await orderReadRepo.findOne({ where: { id: orderId } })
      return row?.status === 'CANCELLED' ? row : null
    })
    expect(read.status).toBe('CANCELLED')
  })
})
