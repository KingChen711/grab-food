import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({ collection: 'order_snapshots', timestamps: false })
export class Snapshot extends Document {
  @Prop({ required: true, index: true })
  public streamId!: string // orderId

  @Prop({ required: true })
  public version!: number

  @Prop({ type: Object, required: true })
  public state!: Record<string, unknown>

  @Prop({ required: true, default: () => new Date() })
  public takenAt!: Date
}

export const SnapshotSchema = SchemaFactory.createForClass(Snapshot)

// One snapshot per (streamId, version), latest version wins
SnapshotSchema.index({ streamId: 1, version: -1 })
