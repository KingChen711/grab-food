import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({ collection: 'order_events', timestamps: false })
export class StoredEvent extends Document {
  @Prop({ required: true, index: true })
  public streamId!: string // orderId

  @Prop({ required: true })
  public version!: number

  @Prop({ required: true })
  public eventType!: string

  @Prop({ type: Object, required: true })
  public data!: Record<string, unknown>

  @Prop({ type: Object, default: {} })
  public metadata!: Record<string, unknown>

  @Prop({ required: true, default: () => new Date() })
  public occurredOn!: Date
}

export const StoredEventSchema = SchemaFactory.createForClass(StoredEvent)

// Unique constraint: one event per (streamId, version)
StoredEventSchema.index({ streamId: 1, version: 1 }, { unique: true })
