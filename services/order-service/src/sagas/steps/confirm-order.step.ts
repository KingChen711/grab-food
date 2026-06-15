import type { OrdersService } from '../../orders/orders.service'
import type { SagaContext } from '../interfaces/saga.interfaces'
import { SAGA_STEP_NAMES } from '../saga.constants'

/**
 * Step 4 — ConfirmOrder (internal)
 *
 * Transitions the order aggregate from CREATED → CONFIRMED inside
 * order-service directly (no RabbitMQ round-trip needed).
 *
 * `estimatedPrepTimeMinutes` defaults to 20 min; will be replaced in
 * Phase 5 once restaurant-service returns its own estimate via the reply
 * from ValidateRestaurantStep.
 *
 * Compensation: nothing to undo here — the parent orchestrator cancels
 * the order aggregate directly.
 */
export class ConfirmOrderStep {
  public static readonly NAME = SAGA_STEP_NAMES.CONFIRM_ORDER

  public static async execute(ctx: SagaContext, ordersService: OrdersService): Promise<void> {
    const prepTime = ctx.estimatedPrepTimeMinutes ?? 20
    await ordersService.confirmOrder(ctx.orderId, { estimatedPrepTimeMinutes: prepTime })
  }
}
