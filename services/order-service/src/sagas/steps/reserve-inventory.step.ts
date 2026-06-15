import type { SagaCommand, SagaContext } from '../interfaces/saga.interfaces'
import { SAGA_QUEUES, SAGA_STEP_NAMES } from '../saga.constants'

export interface ReserveInventoryCommand extends SagaCommand {
  restaurantId: string
  items: Array<{ menuItemId: string; quantity: number }>
}

export interface ReleaseInventoryCommand extends SagaCommand {
  restaurantId: string
  reservationId: string
}

/**
 * Step 2 — ReserveInventory
 *
 * Asks restaurant-service to decrement stock for each ordered item using
 * optimistic locking (version column on inventory row). The reply includes
 * a `reservationId` that is stored in saga context for compensation.
 *
 * Compensation: releases the reservation so stock is restored.
 */
export class ReserveInventoryStep {
  public static readonly NAME = SAGA_STEP_NAMES.RESERVE_INVENTORY
  public static readonly COMMAND_QUEUE = SAGA_QUEUES.COMMANDS.RESERVE_INVENTORY
  public static readonly COMPENSATION_QUEUE = SAGA_QUEUES.COMMANDS.RELEASE_INVENTORY

  public static buildCommand(ctx: SagaContext): ReserveInventoryCommand {
    return {
      sagaId: ctx.sagaId,
      stepName: this.NAME,
      orderId: ctx.orderId,
      restaurantId: ctx.restaurantId,
      items: ctx.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
    }
  }

  public static buildCompensationCommand(ctx: SagaContext): ReleaseInventoryCommand | null {
    if (!ctx.inventoryReservationId) return null
    return {
      sagaId: ctx.sagaId,
      stepName: this.NAME,
      orderId: ctx.orderId,
      restaurantId: ctx.restaurantId,
      reservationId: ctx.inventoryReservationId,
    }
  }
}
