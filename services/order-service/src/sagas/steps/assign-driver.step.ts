import type { SagaCommand, SagaContext } from '../interfaces/saga.interfaces'
import { SAGA_QUEUES, SAGA_STEP_NAMES } from '../saga.constants'

export interface AssignDriverCommand extends SagaCommand {
  restaurantId: string
  pickupAddress: { address: string; lat: number; lng: number }
  dropoffAddress: { address: string; lat: number; lng: number; notes?: string }
  orderTotal: number
}

export interface UnassignDriverCommand extends SagaCommand {
  driverId: string
  reason: string
}

/**
 * Step 5 — AssignDriver
 *
 * Asks delivery-service to find and lock an available driver using the
 * smart assignment algorithm (distance × rating × load × direction).
 * The reply includes a `driverId` stored in saga context.
 *
 * Compensation: releases the driver so they can accept other orders.
 */
export class AssignDriverStep {
  public static readonly NAME = SAGA_STEP_NAMES.ASSIGN_DRIVER
  public static readonly COMMAND_QUEUE = SAGA_QUEUES.COMMANDS.ASSIGN_DRIVER
  public static readonly COMPENSATION_QUEUE = SAGA_QUEUES.COMMANDS.UNASSIGN_DRIVER

  public static buildCommand(ctx: SagaContext): AssignDriverCommand {
    return {
      sagaId: ctx.sagaId,
      stepName: this.NAME,
      orderId: ctx.orderId,
      restaurantId: ctx.restaurantId,
      pickupAddress: {
        // Pickup is at the restaurant — delivery-service resolves coordinates by restaurantId
        address: ctx.restaurantName,
        lat: 0,
        lng: 0,
      },
      dropoffAddress: ctx.deliveryAddress,
      orderTotal: ctx.total,
    }
  }

  public static buildCompensationCommand(ctx: SagaContext): UnassignDriverCommand | null {
    if (!ctx.driverId) return null
    return {
      sagaId: ctx.sagaId,
      stepName: this.NAME,
      orderId: ctx.orderId,
      driverId: ctx.driverId,
      reason: 'Order cancelled — driver released',
    }
  }
}
