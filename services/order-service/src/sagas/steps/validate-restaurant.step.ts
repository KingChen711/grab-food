import type { SagaCommand, SagaContext } from '../interfaces/saga.interfaces'
import { SAGA_QUEUES, SAGA_STEP_NAMES } from '../saga.constants'

export interface ValidateRestaurantCommand extends SagaCommand {
  restaurantId: string
  items: Array<{ menuItemId: string; quantity: number }>
}

export interface NotifyRestaurantCancelledCommand extends SagaCommand {
  restaurantId: string
  reason: string
}

/**
 * Step 1 — ValidateRestaurant
 *
 * Asks restaurant-service to confirm the restaurant is open and all ordered
 * items are currently available. If validation fails the saga is aborted.
 *
 * Compensation: notifies restaurant-service that the order was cancelled
 * (so it can update any dashboards / metrics).
 */
export class ValidateRestaurantStep {
  static readonly NAME = SAGA_STEP_NAMES.VALIDATE_RESTAURANT
  static readonly COMMAND_QUEUE = SAGA_QUEUES.COMMANDS.VALIDATE_RESTAURANT
  static readonly COMPENSATION_QUEUE = SAGA_QUEUES.COMMANDS.NOTIFY_RESTAURANT_CANCELLED

  static buildCommand(ctx: SagaContext): ValidateRestaurantCommand {
    return {
      sagaId: ctx.sagaId,
      stepName: this.NAME,
      orderId: ctx.orderId,
      restaurantId: ctx.restaurantId,
      items: ctx.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
    }
  }

  static buildCompensationCommand(ctx: SagaContext): NotifyRestaurantCancelledCommand {
    return {
      sagaId: ctx.sagaId,
      stepName: this.NAME,
      orderId: ctx.orderId,
      restaurantId: ctx.restaurantId,
      reason: ctx.notes ?? 'Order cancelled by system',
    }
  }
}
