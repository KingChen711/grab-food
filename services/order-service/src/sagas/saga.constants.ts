/** RabbitMQ queue names used by the order fulfilment saga */
export const SAGA_QUEUES = {
  COMMANDS: {
    VALIDATE_RESTAURANT: 'saga.commands.validate-restaurant',
    NOTIFY_RESTAURANT_CANCELLED: 'saga.commands.notify-restaurant-cancelled',
    RESERVE_INVENTORY: 'saga.commands.reserve-inventory',
    RELEASE_INVENTORY: 'saga.commands.release-inventory',
    PROCESS_PAYMENT: 'saga.commands.process-payment',
    REFUND_PAYMENT: 'saga.commands.refund-payment',
    ASSIGN_DRIVER: 'saga.commands.assign-driver',
    UNASSIGN_DRIVER: 'saga.commands.unassign-driver',
  },
  REPLIES: 'saga.replies',
  DLQ: 'saga.dlq',
} as const

/** Step names — order matters (this is the execution sequence) */
export const SAGA_STEP_NAMES = {
  VALIDATE_RESTAURANT: 'validate-restaurant',
  RESERVE_INVENTORY: 'reserve-inventory',
  PROCESS_PAYMENT: 'process-payment',
  CONFIRM_ORDER: 'confirm-order',
  ASSIGN_DRIVER: 'assign-driver',
} as const

export type SagaStepName = (typeof SAGA_STEP_NAMES)[keyof typeof SAGA_STEP_NAMES]

/** Ordered list of steps — the orchestrator walks this array */
export const SAGA_STEP_SEQUENCE: SagaStepName[] = [
  SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
  SAGA_STEP_NAMES.RESERVE_INVENTORY,
  SAGA_STEP_NAMES.PROCESS_PAYMENT,
  SAGA_STEP_NAMES.CONFIRM_ORDER,
  SAGA_STEP_NAMES.ASSIGN_DRIVER,
]

/** Steps that run internally (no RabbitMQ round-trip) */
export const INTERNAL_STEPS = new Set<SagaStepName>([SAGA_STEP_NAMES.CONFIRM_ORDER])

/** Per-step timeout before compensation is triggered (ms) */
export const SAGA_STEP_TIMEOUT_MS = 30_000

/** BullMQ queue name for step timeout jobs */
export const SAGA_TIMEOUT_QUEUE = 'saga-timeouts'

/** BullMQ job type */
export const SAGA_TIMEOUT_JOB = 'step-timeout'
