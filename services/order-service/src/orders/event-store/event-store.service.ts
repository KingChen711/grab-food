import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { Model } from 'mongoose'

import { OrderAggregate } from '../domain/order.aggregate'
import { Snapshot } from './schemas/snapshot.schema'
import { StoredEvent } from './schemas/stored-event.schema'

const SNAPSHOT_THRESHOLD = 50

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name)

  constructor(
    @InjectModel(StoredEvent.name) private readonly eventModel: Model<StoredEvent>,
    @InjectModel(Snapshot.name) private readonly snapshotModel: Model<Snapshot>,
  ) {}

  // ─── Write ────────────────────────────────────────────────────────────────────

  public async append(aggregate: OrderAggregate): Promise<void> {
    const events = aggregate.getUncommittedEvents()
    if (events.length === 0) return

    const docs = events.map((event, i) => ({
      streamId: aggregate.id,
      version: aggregate.version - events.length + i + 1,
      eventType: event.constructor.name.replace('Event', ''),
      data: { ...event } as Record<string, unknown>,
      occurredOn: event.occurredOn,
    }))

    await this.eventModel.insertMany(docs)
    aggregate.clearUncommittedEvents()

    if (aggregate.version % SNAPSHOT_THRESHOLD === 0) {
      await this.saveSnapshot(aggregate)
    }
  }

  private async saveSnapshot(aggregate: OrderAggregate): Promise<void> {
    await this.snapshotModel.create({
      streamId: aggregate.id,
      version: aggregate.version,
      state: aggregate.toSnapshot(),
      takenAt: new Date(),
    })
    this.logger.debug(`Snapshot saved for order ${aggregate.id} at v${aggregate.version}`)
  }

  // ─── Read ─────────────────────────────────────────────────────────────────────

  public async load(orderId: string): Promise<OrderAggregate | null> {
    const snapshot = await this.snapshotModel
      .findOne({ streamId: orderId })
      .sort({ version: -1 })
      .lean()
      .exec()

    let aggregate: OrderAggregate
    let fromVersion = 0

    if (snapshot) {
      aggregate = OrderAggregate.fromSnapshot(snapshot.state as Record<string, unknown>)
      fromVersion = snapshot.version
    } else {
      aggregate = new OrderAggregate()
    }

    const storedEvents = await this.eventModel
      .find({ streamId: orderId, version: { $gt: fromVersion } })
      .sort({ version: 1 })
      .lean()
      .exec()

    if (storedEvents.length === 0 && !snapshot) return null

    if (storedEvents.length > 0) {
      aggregate.loadFromHistory(
        storedEvents.map((e) => ({
          eventType: e.eventType,
          data: e.data,
          version: e.version,
        })),
      )
    }

    return aggregate
  }

  public async loadEvents(
    orderId: string,
    fromVersion = 0,
  ): Promise<
    Array<{ eventType: string; data: Record<string, unknown>; version: number; occurredOn: Date }>
  > {
    const events = await this.eventModel
      .find({ streamId: orderId, version: { $gt: fromVersion } })
      .sort({ version: 1 })
      .lean()
      .exec()

    return events.map((e) => ({
      eventType: e.eventType,
      data: e.data,
      version: e.version,
      occurredOn: e.occurredOn,
    }))
  }
}
