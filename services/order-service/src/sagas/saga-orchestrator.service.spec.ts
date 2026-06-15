import { getQueueToken } from '@nestjs/bull'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'

import type { OrderCreatedEvent } from '../orders/domain/events/order-created.event'
import type { SagaReply } from './interfaces/saga.interfaces'
import { RabbitMQService } from './rabbitmq.service'
import { SAGA_QUEUES, SAGA_STEP_NAMES, SAGA_TIMEOUT_QUEUE } from './saga.constants'
import { ORDERS_SERVICE_TOKEN, SagaOrchestratorService } from './saga-orchestrator.service'
import { SagaStateDocument } from './schemas/saga-state.schema'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORDER_ID = '00000000-0000-0000-0000-000000000001'
const CUSTOMER_ID = '00000000-0000-0000-0000-000000000002'
const RESTAURANT_ID = '00000000-0000-0000-0000-000000000003'
const SAGA_ID = '00000000-0000-0000-0000-000000000099'

const mockOrderCreatedEvent = {
  orderId: ORDER_ID,
  customerId: CUSTOMER_ID,
  restaurantId: RESTAURANT_ID,
  restaurantName: 'Pizza Palace',
  items: [{ menuItemId: 'item-1', menuItemName: 'Pizza', quantity: 2, unitPrice: 10 }],
  subtotal: 20,
  deliveryFee: 2,
  tax: 2,
  total: 24,
  deliveryAddress: { address: '123 Main St', lat: 10.0, lng: 106.0 },
  notes: undefined,
} as unknown as OrderCreatedEvent

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeSagaDoc = (overrides = {}) => ({
  sagaId: SAGA_ID,
  orderId: ORDER_ID,
  status: 'RUNNING',
  completedSteps: [],
  currentStep: SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
  context: {
    sagaId: SAGA_ID,
    orderId: ORDER_ID,
    customerId: CUSTOMER_ID,
    restaurantId: RESTAURANT_ID,
    restaurantName: 'Pizza Palace',
    items: [{ menuItemId: 'item-1', menuItemName: 'Pizza', quantity: 2, unitPrice: 10 }],
    subtotal: 20,
    deliveryFee: 2,
    tax: 2,
    total: 24,
    deliveryAddress: { address: '123 Main St', lat: 10.0, lng: 106.0 },
  },
  timeoutJobId: 'job-1',
  ...overrides,
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SagaOrchestratorService', () => {
  let service: SagaOrchestratorService
  let sagaModelMock: Record<string, jest.Mock>
  let rabbitMQMock: { publish: jest.Mock; consume: jest.Mock }
  let timeoutQueueMock: { add: jest.Mock; getJob: jest.Mock }
  let ordersServiceMock: { confirmOrder: jest.Mock; cancel: jest.Mock }

  beforeEach(async () => {
    // Chainable Mongoose query builder mock
    const lean = jest.fn()
    const exec = jest.fn()
    lean.mockReturnValue({ exec })

    sagaModelMock = {
      create: jest.fn(),
      findOne: jest
        .fn()
        .mockReturnValue({ lean: () => ({ exec: jest.fn().mockResolvedValue(null) }) }),
      findOneAndUpdate: jest
        .fn()
        .mockReturnValue({ lean: () => ({ exec: jest.fn().mockResolvedValue(null) }) }),
      updateOne: jest.fn().mockResolvedValue({}),
    }

    rabbitMQMock = {
      publish: jest.fn(),
      consume: jest.fn().mockResolvedValue(undefined),
    }

    timeoutQueueMock = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getJob: jest.fn().mockResolvedValue({ remove: jest.fn() }),
    }

    ordersServiceMock = {
      confirmOrder: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn().mockResolvedValue(undefined),
    }

    const module = await Test.createTestingModule({
      providers: [
        SagaOrchestratorService,
        { provide: getModelToken(SagaStateDocument.name), useValue: sagaModelMock },
        { provide: RabbitMQService, useValue: rabbitMQMock },
        { provide: getQueueToken(SAGA_TIMEOUT_QUEUE), useValue: timeoutQueueMock },
        { provide: ORDERS_SERVICE_TOKEN, useValue: ordersServiceMock },
      ],
    }).compile()

    service = module.get(SagaOrchestratorService)
    await service.onModuleInit()
  })

  // ── bootstrap ─────────────────────────────────────────────────────────────

  it('starts consuming the saga.replies queue on init', () => {
    expect(rabbitMQMock.consume).toHaveBeenCalledWith(SAGA_QUEUES.REPLIES, expect.any(Function))
  })

  // ── startSaga ─────────────────────────────────────────────────────────────

  describe('startSaga', () => {
    beforeEach(() => {
      sagaModelMock['create'].mockResolvedValue({ sagaId: SAGA_ID })
      sagaModelMock['findOneAndUpdate'].mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(makeSagaDoc()) }),
      })
    })

    it('creates a saga document in MongoDB', async () => {
      await service.startSaga(mockOrderCreatedEvent)
      expect(sagaModelMock['create']).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: ORDER_ID, status: 'PENDING' }),
      )
    })

    it('publishes the first command (validate-restaurant) to RabbitMQ', async () => {
      await service.startSaga(mockOrderCreatedEvent)
      expect(rabbitMQMock.publish).toHaveBeenCalledWith(
        SAGA_QUEUES.COMMANDS.VALIDATE_RESTAURANT,
        expect.objectContaining({ orderId: ORDER_ID }),
      )
    })

    it('enqueues a step-timeout job in BullMQ', async () => {
      await service.startSaga(mockOrderCreatedEvent)
      expect(timeoutQueueMock.add).toHaveBeenCalledWith(
        'step-timeout',
        expect.objectContaining({ stepName: SAGA_STEP_NAMES.VALIDATE_RESTAURANT }),
        expect.objectContaining({ delay: expect.any(Number) }),
      )
    })
  })

  // ── handleReply — happy path ───────────────────────────────────────────────

  describe('handleReply — success advances to next step', () => {
    it('ignores reply for unknown saga', async () => {
      sagaModelMock['findOne'].mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      })
      await service.handleReply({
        sagaId: 'unknown',
        stepName: SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
        success: true,
      })
      expect(rabbitMQMock.publish).not.toHaveBeenCalled()
    })

    it('ignores reply when saga is not RUNNING', async () => {
      sagaModelMock['findOne'].mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(makeSagaDoc({ status: 'COMPLETED' })) }),
      })
      const reply: SagaReply = {
        sagaId: SAGA_ID,
        stepName: SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
        success: true,
      }
      await service.handleReply(reply)
      expect(sagaModelMock['updateOne']).not.toHaveBeenCalled()
    })

    it('ignores stale replies (wrong step)', async () => {
      sagaModelMock['findOne'].mockReturnValue({
        lean: () => ({
          exec: jest
            .fn()
            .mockResolvedValue(makeSagaDoc({ currentStep: SAGA_STEP_NAMES.RESERVE_INVENTORY })),
        }),
      })
      const reply: SagaReply = {
        sagaId: SAGA_ID,
        stepName: SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
        success: true,
      }
      await service.handleReply(reply)
      expect(sagaModelMock['updateOne']).not.toHaveBeenCalled()
    })

    it('advances to reserve-inventory after validate-restaurant succeeds', async () => {
      // First findOne = for the reply handler; second findOne = inside onStepSuccess
      sagaModelMock['findOne']
        .mockReturnValueOnce({
          lean: () => ({ exec: jest.fn().mockResolvedValue(makeSagaDoc()) }),
        })
        .mockReturnValueOnce({
          lean: () => ({ exec: jest.fn().mockResolvedValue(makeSagaDoc()) }),
        })
      sagaModelMock['findOneAndUpdate'].mockReturnValue({
        lean: () => ({
          exec: jest
            .fn()
            .mockResolvedValue(makeSagaDoc({ currentStep: SAGA_STEP_NAMES.RESERVE_INVENTORY })),
        }),
      })

      const reply: SagaReply = {
        sagaId: SAGA_ID,
        stepName: SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
        success: true,
      }
      await service.handleReply(reply)

      expect(rabbitMQMock.publish).toHaveBeenCalledWith(
        SAGA_QUEUES.COMMANDS.RESERVE_INVENTORY,
        expect.objectContaining({ orderId: ORDER_ID }),
      )
    })
  })

  // ── handleReply — compensation path ───────────────────────────────────────

  describe('handleReply — failure triggers compensation', () => {
    it('publishes compensation command when validate-restaurant fails', async () => {
      sagaModelMock['findOne']
        .mockReturnValueOnce({
          lean: () => ({ exec: jest.fn().mockResolvedValue(makeSagaDoc()) }),
        })
        .mockReturnValueOnce({
          lean: () => ({
            exec: jest.fn().mockResolvedValue(makeSagaDoc({ status: 'COMPENSATING' })),
          }),
        })

      const reply: SagaReply = {
        sagaId: SAGA_ID,
        stepName: SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
        success: false,
        error: 'Restaurant is closed',
      }
      await service.handleReply(reply)

      expect(ordersServiceMock.cancel).toHaveBeenCalledWith(
        ORDER_ID,
        expect.objectContaining({ cancelledBy: 'system' }),
      )
    })

    it('publishes refund command when process-payment step had previously succeeded', async () => {
      const sagaWithPayment = makeSagaDoc({
        completedSteps: [
          SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
          SAGA_STEP_NAMES.RESERVE_INVENTORY,
          SAGA_STEP_NAMES.PROCESS_PAYMENT,
        ],
        currentStep: SAGA_STEP_NAMES.CONFIRM_ORDER,
        context: {
          ...makeSagaDoc().context,
          inventoryReservationId: 'res-1',
          paymentIntentId: 'pi_test_123',
        },
      })

      sagaModelMock['findOne']
        .mockReturnValueOnce({
          lean: () => ({ exec: jest.fn().mockResolvedValue(sagaWithPayment) }),
        })
        .mockReturnValueOnce({
          lean: () => ({
            exec: jest.fn().mockResolvedValue({ ...sagaWithPayment, status: 'COMPENSATING' }),
          }),
        })

      // Trigger failure via timeout (same code path)
      await service.handleTimeout(SAGA_ID, SAGA_STEP_NAMES.CONFIRM_ORDER)

      // Refund should be published
      expect(rabbitMQMock.publish).toHaveBeenCalledWith(
        SAGA_QUEUES.COMMANDS.REFUND_PAYMENT,
        expect.objectContaining({ paymentIntentId: 'pi_test_123' }),
      )
      // Inventory release should be published
      expect(rabbitMQMock.publish).toHaveBeenCalledWith(
        SAGA_QUEUES.COMMANDS.RELEASE_INVENTORY,
        expect.objectContaining({ reservationId: 'res-1' }),
      )
    })
  })

  // ── handleTimeout ─────────────────────────────────────────────────────────

  describe('handleTimeout', () => {
    it('ignores timeout for completed saga', async () => {
      sagaModelMock['findOne'].mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(makeSagaDoc({ status: 'COMPLETED' })) }),
      })
      await service.handleTimeout(SAGA_ID, SAGA_STEP_NAMES.VALIDATE_RESTAURANT)
      expect(ordersServiceMock.cancel).not.toHaveBeenCalled()
    })

    it('triggers compensation on timeout for running step', async () => {
      sagaModelMock['findOne']
        .mockReturnValueOnce({
          lean: () => ({ exec: jest.fn().mockResolvedValue(makeSagaDoc()) }),
        })
        .mockReturnValueOnce({
          lean: () => ({
            exec: jest.fn().mockResolvedValue(makeSagaDoc({ status: 'COMPENSATING' })),
          }),
        })

      await service.handleTimeout(SAGA_ID, SAGA_STEP_NAMES.VALIDATE_RESTAURANT)
      expect(ordersServiceMock.cancel).toHaveBeenCalled()
    })
  })

  // ── End-to-end happy path ────────────────────────────────────────────────

  describe('end-to-end happy path (5 steps)', () => {
    it('walks through validate → reserve → payment → confirm → assign sequentially', async () => {
      // Track which step the orchestrator believes the saga is on. Each
      // findOneAndUpdate (transition) bumps this; each findOne (read) returns
      // the doc reflecting the current step.
      let currentStep: string = SAGA_STEP_NAMES.VALIDATE_RESTAURANT
      const completedSteps: string[] = []

      sagaModelMock['create'].mockResolvedValue({ sagaId: SAGA_ID })

      // Mongoose findOne always reflects the current state
      sagaModelMock['findOne'].mockImplementation(() => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue(makeSagaDoc({ currentStep, completedSteps })),
        }),
      }))

      // The orchestrator passes flat update objects (no $set wrapping) for
      // `executeStep` (which sets currentStep) and uses `updateOne` for
      // pushing completed steps. We track currentStep here so subsequent
      // findOne calls return a saga doc that reflects the active step.
      sagaModelMock['findOneAndUpdate'].mockImplementation(
        (_filter: unknown, update: Record<string, unknown>) => {
          if (typeof update.currentStep === 'string') currentStep = update.currentStep
          return {
            lean: () => ({
              exec: jest.fn().mockResolvedValue(makeSagaDoc({ currentStep, completedSteps })),
            }),
          }
        },
      )

      // updateOne is called by onStepSuccess to record completed steps.
      sagaModelMock['updateOne'].mockImplementation(
        (_filter: unknown, update: Record<string, unknown>) => {
          const updatedSteps = update.completedSteps as string[] | undefined
          if (Array.isArray(updatedSteps)) {
            completedSteps.length = 0
            completedSteps.push(...updatedSteps)
          }
          return Promise.resolve({})
        },
      )

      // Step 1: kick off saga — should publish validate-restaurant command
      await service.startSaga(mockOrderCreatedEvent)
      expect(rabbitMQMock.publish).toHaveBeenCalledWith(
        SAGA_QUEUES.COMMANDS.VALIDATE_RESTAURANT,
        expect.objectContaining({ orderId: ORDER_ID }),
      )

      // Step 2: reply success for validate → orchestrator publishes reserve-inventory
      rabbitMQMock.publish.mockClear()
      await service.handleReply({
        sagaId: SAGA_ID,
        stepName: SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
        success: true,
      })
      expect(rabbitMQMock.publish).toHaveBeenCalledWith(
        SAGA_QUEUES.COMMANDS.RESERVE_INVENTORY,
        expect.objectContaining({ orderId: ORDER_ID }),
      )

      // Step 3: reply success for reserve → orchestrator publishes process-payment
      rabbitMQMock.publish.mockClear()
      await service.handleReply({
        sagaId: SAGA_ID,
        stepName: SAGA_STEP_NAMES.RESERVE_INVENTORY,
        success: true,
        data: { reservationId: 'res-1' },
      })
      expect(rabbitMQMock.publish).toHaveBeenCalledWith(
        SAGA_QUEUES.COMMANDS.PROCESS_PAYMENT,
        expect.objectContaining({ orderId: ORDER_ID }),
      )

      // Step 4: reply success for payment → orchestrator runs confirm-order
      // (internal — no RabbitMQ publish for confirm itself), then publishes
      // assign-driver.
      rabbitMQMock.publish.mockClear()
      await service.handleReply({
        sagaId: SAGA_ID,
        stepName: SAGA_STEP_NAMES.PROCESS_PAYMENT,
        success: true,
        data: { paymentIntentId: 'pi_test' },
      })
      expect(ordersServiceMock.confirmOrder).toHaveBeenCalledWith(
        ORDER_ID,
        expect.objectContaining({ estimatedPrepTimeMinutes: expect.any(Number) }),
      )
      expect(rabbitMQMock.publish).toHaveBeenCalledWith(
        SAGA_QUEUES.COMMANDS.ASSIGN_DRIVER,
        expect.objectContaining({ orderId: ORDER_ID }),
      )

      // Step 5: reply success for assign-driver → saga completes (no further publishes)
      rabbitMQMock.publish.mockClear()
      await service.handleReply({
        sagaId: SAGA_ID,
        stepName: SAGA_STEP_NAMES.ASSIGN_DRIVER,
        success: true,
        data: { driverId: 'driver-1' },
      })
      // No further saga commands published
      const stepCommandTopics = Object.values(SAGA_QUEUES.COMMANDS)
      const publishedTopics = rabbitMQMock.publish.mock.calls.map((c) => c[0])
      for (const topic of publishedTopics) {
        expect(stepCommandTopics).not.toContain(topic)
      }

      // Order should never be cancelled on the happy path
      expect(ordersServiceMock.cancel).not.toHaveBeenCalled()
    })
  })

  // ── confirm-order internal step ───────────────────────────────────────────

  describe('confirm-order internal step', () => {
    it('calls ordersService.confirmOrder directly (no RabbitMQ publish)', async () => {
      const sagaAtConfirm = makeSagaDoc({
        completedSteps: [
          SAGA_STEP_NAMES.VALIDATE_RESTAURANT,
          SAGA_STEP_NAMES.RESERVE_INVENTORY,
          SAGA_STEP_NAMES.PROCESS_PAYMENT,
        ],
        currentStep: SAGA_STEP_NAMES.CONFIRM_ORDER,
      })

      sagaModelMock['findOneAndUpdate'].mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(sagaAtConfirm) }),
      })
      // onStepSuccess call after internal step
      sagaModelMock['findOne'].mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(sagaAtConfirm) }),
      })
      sagaModelMock['findOneAndUpdate'].mockReturnValue({
        lean: () => ({
          exec: jest
            .fn()
            .mockResolvedValue(makeSagaDoc({ currentStep: SAGA_STEP_NAMES.ASSIGN_DRIVER })),
        }),
      })

      // Simulate: saga reply arrives for PROCESS_PAYMENT that triggers CONFIRM_ORDER
      // We test executeInternalStep indirectly via a direct call to a fresh saga doc
      await (service as any).executeInternalStep(
        SAGA_ID,
        SAGA_STEP_NAMES.CONFIRM_ORDER,
        sagaAtConfirm.context,
      )

      expect(ordersServiceMock.confirmOrder).toHaveBeenCalledWith(ORDER_ID, {
        estimatedPrepTimeMinutes: 20,
      })
      // After internal confirm succeeds, orchestrator advances to assign-driver (external)
      // so publish IS called — but it should NOT have published a confirm-order RabbitMQ command
      expect(rabbitMQMock.publish).not.toHaveBeenCalledWith(
        expect.stringContaining('confirm-order'),
        expect.anything(),
      )
    })
  })
})
