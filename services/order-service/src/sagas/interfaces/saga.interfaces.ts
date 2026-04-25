import type { SagaStepName } from '../saga.constants'

// ─── Context (stored in MongoDB, grows as saga progresses) ────────────────────

export interface SagaOrderItem {
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
}

export interface SagaDeliveryAddress {
  address: string
  lat: number
  lng: number
  notes?: string
}

export interface SagaContext {
  sagaId: string
  orderId: string
  customerId: string
  restaurantId: string
  restaurantName: string
  items: SagaOrderItem[]
  subtotal: number
  deliveryFee: number
  tax: number
  total: number
  deliveryAddress: SagaDeliveryAddress
  notes?: string
  // Populated as each step succeeds:
  inventoryReservationId?: string
  paymentIntentId?: string
  driverId?: string
  estimatedPrepTimeMinutes?: number
}

// ─── RabbitMQ message contracts ───────────────────────────────────────────────

export interface SagaCommand {
  sagaId: string
  stepName: SagaStepName
  orderId: string
  [key: string]: unknown
}

export interface SagaReply {
  sagaId: string
  stepName: SagaStepName
  success: boolean
  /** Step-specific payload merged into SagaContext on success */
  data?: Partial<SagaContext>
  error?: string
}

// ─── BullMQ job payload ───────────────────────────────────────────────────────

export interface SagaTimeoutJobData {
  sagaId: string
  stepName: SagaStepName
}
