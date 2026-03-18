import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EventStoreService } from './event-store/event-store.service'
import { Snapshot, SnapshotSchema } from './event-store/schemas/snapshot.schema'
import { StoredEvent, StoredEventSchema } from './event-store/schemas/stored-event.schema'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { OrderItemRead } from './projections/entities/order-item-read.entity'
import { OrderRead } from './projections/entities/order-read.entity'
import { OrderTimeline } from './projections/entities/order-timeline.entity'
import { OrderReadProjection } from './projections/order-read.projection'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoredEvent.name, schema: StoredEventSchema },
      { name: Snapshot.name, schema: SnapshotSchema },
    ]),
    TypeOrmModule.forFeature([OrderRead, OrderItemRead, OrderTimeline]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, EventStoreService, OrderReadProjection],
  exports: [OrdersService],
})
export class OrdersModule {}
