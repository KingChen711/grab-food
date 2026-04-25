import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import type { Job } from 'bull'

import type { SagaTimeoutJobData } from './interfaces/saga.interfaces'
import { SAGA_TIMEOUT_JOB, SAGA_TIMEOUT_QUEUE } from './saga.constants'
import { SagaOrchestratorService } from './saga-orchestrator.service'

@Processor(SAGA_TIMEOUT_QUEUE)
export class SagaTimeoutProcessor {
  private readonly logger = new Logger(SagaTimeoutProcessor.name)

  constructor(private readonly orchestrator: SagaOrchestratorService) {}

  @Process(SAGA_TIMEOUT_JOB)
  public async handle(job: Job<SagaTimeoutJobData>): Promise<void> {
    const { sagaId, stepName } = job.data
    this.logger.warn(`Timeout fired for saga ${sagaId}, step "${stepName}"`)
    await this.orchestrator.handleTimeout(sagaId, stepName)
  }
}
