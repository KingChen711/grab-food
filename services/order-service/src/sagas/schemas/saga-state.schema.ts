import type { SagaStatus } from '@grab/types'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

import type { SagaContext } from '../interfaces/saga.interfaces'

@Schema({ collection: 'saga_states', timestamps: true })
export class SagaStateDocument extends Document {
  @Prop({ required: true, unique: true, index: true })
  public sagaId!: string

  @Prop({ required: true })
  public orderId!: string

  @Prop({
    type: String,
    required: true,
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'COMPENSATING', 'FAILED'],
    default: 'PENDING',
  })
  public status!: SagaStatus

  @Prop({ type: [String], default: [] })
  public completedSteps!: string[]

  @Prop({ type: String, nullable: true })
  public currentStep?: string

  @Prop({ type: Object, required: true })
  public context!: SagaContext

  @Prop({ type: String, nullable: true })
  public error?: string

  /** BullMQ job ID so the active timeout can be cancelled on reply */
  @Prop({ type: String, nullable: true })
  public timeoutJobId?: string

  @Prop({ required: true })
  public startedAt!: Date

  @Prop({ type: Date, nullable: true })
  public completedAt?: Date
}

export const SagaStateSchema = SchemaFactory.createForClass(SagaStateDocument)
SagaStateSchema.index({ orderId: 1 })
SagaStateSchema.index({ status: 1 })
