import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'

import { OrderAggregate } from '../domain/order.aggregate'
import { EventStoreService } from './event-store.service'
import { Snapshot } from './schemas/snapshot.schema'
import { StoredEvent } from './schemas/stored-event.schema'

// ─── Mongoose query-chain mock: .find().sort().lean().exec() ─────────────────────

function chain<T>(result: T) {
  const c: { sort: jest.Mock; lean: jest.Mock; exec: jest.Mock } = {
    sort: jest.fn(() => c),
    lean: jest.fn(() => c),
    exec: jest.fn(() => Promise.resolve(result)),
  }
  return c
}

const DELIVERY_ADDRESS = { address: '1 Le Loi', lat: 10.77, lng: 106.7 }

function newOrder(): OrderAggregate {
  return OrderAggregate.create(
    'order-1',
    'cust-1',
    'rest-1',
    'Pizza Palace',
    [],
    200_000,
    15_000,
    5_000,
    220_000,
    DELIVERY_ADDRESS,
  )
}

describe('EventStoreService', () => {
  let service: EventStoreService
  let eventModel: { insertMany: jest.Mock; find: jest.Mock }
  let snapshotModel: { findOne: jest.Mock; create: jest.Mock }

  beforeEach(async () => {
    eventModel = { insertMany: jest.fn().mockResolvedValue(undefined), find: jest.fn() }
    snapshotModel = { findOne: jest.fn(), create: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        EventStoreService,
        { provide: getModelToken(StoredEvent.name), useValue: eventModel },
        { provide: getModelToken(Snapshot.name), useValue: snapshotModel },
      ],
    }).compile()

    service = module.get(EventStoreService)
  })

  afterEach(() => jest.clearAllMocks())

  // ─── append ────────────────────────────────────────────────────────────────────

  describe('append', () => {
    it('persists uncommitted events with monotonic versions and clears them', async () => {
      const agg = newOrder() // version 1, 1 uncommitted event

      await service.append(agg)

      expect(eventModel.insertMany).toHaveBeenCalledTimes(1)
      const docs = eventModel.insertMany.mock.calls[0][0]
      expect(docs).toHaveLength(1)
      expect(docs[0]).toMatchObject({ streamId: 'order-1', version: 1, eventType: 'OrderCreated' })
      expect(agg.getUncommittedEvents()).toHaveLength(0)
    })

    it('is a no-op when there are no uncommitted events', async () => {
      const agg = newOrder()
      agg.clearUncommittedEvents()

      await service.append(agg)

      expect(eventModel.insertMany).not.toHaveBeenCalled()
    })

    it('writes a snapshot when version crosses the threshold (every 50 events)', async () => {
      const agg = newOrder()
      agg.version = 50 // force the snapshot boundary

      await service.append(agg)

      expect(snapshotModel.create).toHaveBeenCalledTimes(1)
      expect(snapshotModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ streamId: 'order-1', version: 50 }),
      )
    })

    it('does not snapshot off-threshold versions', async () => {
      const agg = newOrder() // version 1
      await service.append(agg)
      expect(snapshotModel.create).not.toHaveBeenCalled()
    })
  })

  // ─── load ──────────────────────────────────────────────────────────────────────

  describe('load', () => {
    it('returns null for an unknown stream (no snapshot, no events)', async () => {
      snapshotModel.findOne.mockReturnValue(chain(null))
      eventModel.find.mockReturnValue(chain([]))

      await expect(service.load('missing')).resolves.toBeNull()
    })

    it('rebuilds an aggregate by replaying the event stream', async () => {
      const source = newOrder()
      const [created] = source.getUncommittedEvents()
      const stored = { eventType: 'OrderCreated', data: { ...created }, version: 1 }

      snapshotModel.findOne.mockReturnValue(chain(null))
      eventModel.find.mockReturnValue(chain([stored]))

      const agg = await service.load('order-1')

      expect(agg).not.toBeNull()
      expect(agg!.status).toBe('CREATED')
      expect(agg!.customerId).toBe('cust-1')
      expect(agg!.version).toBe(1)
    })

    it('restores from a snapshot then applies only newer events', async () => {
      const snapSource = newOrder() // CREATED @ v1
      snapSource.clearUncommittedEvents()
      const snapshot = { streamId: 'order-1', version: 1, state: snapSource.toSnapshot() }

      const confirmSource = newOrder()
      confirmSource.confirm(20) // adds OrderConfirmed
      const confirmed = confirmSource
        .getUncommittedEvents()
        .find((e) => e.constructor.name === 'OrderConfirmedEvent')!
      const storedConfirmed = { eventType: 'OrderConfirmed', data: { ...confirmed }, version: 2 }

      snapshotModel.findOne.mockReturnValue(chain(snapshot))
      eventModel.find.mockReturnValue(chain([storedConfirmed]))

      const agg = await service.load('order-1')

      expect(agg!.status).toBe('CONFIRMED')
      expect(agg!.estimatedPrepTimeMinutes).toBe(20)
      expect(agg!.version).toBe(2)
      // only events newer than the snapshot version are queried
      expect(eventModel.find).toHaveBeenCalledWith({
        streamId: 'order-1',
        version: { $gt: 1 },
      })
    })
  })

  // ─── loadEvents ──────────────────────────────────────────────────────────────

  describe('loadEvents', () => {
    it('returns the raw stored events mapped to a flat shape', async () => {
      const occurredOn = new Date()
      eventModel.find.mockReturnValue(
        chain([
          { eventType: 'OrderCreated', data: { orderId: 'order-1' }, version: 1, occurredOn },
        ]),
      )

      const events = await service.loadEvents('order-1')

      expect(events).toEqual([
        { eventType: 'OrderCreated', data: { orderId: 'order-1' }, version: 1, occurredOn },
      ])
    })
  })
})
