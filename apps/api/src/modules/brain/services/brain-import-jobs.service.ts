import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import type { Queue } from 'bullmq'
import { ErrorReporter } from '@vibey/api-shared'
import { AGENT_RUNTIME_BRAIN_IMPORT_QUEUE } from '../../agent-runtime/agent-runtime-queues'
import { BrainImportJobsInputRepository } from '../repositories/brain-import-jobs-input.repository'
import { BrainImportJobsRuntimeRepository } from '../repositories/brain-import-jobs-runtime.repository'
import { BrainImportJobsInputBase } from './brain-import-jobs-input.base'

export type {
  BrainImportRuntimeClaimResult,
  BrainImportRuntimeExecutionChunk,
  BrainImportRuntimeExecutionPayload,
} from './brain-import-jobs.types'

@Injectable()
export class BrainImportJobsService
  extends BrainImportJobsInputBase
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    moduleRef: ModuleRef,
    errorReporter: ErrorReporter,
    runtimeRepository: BrainImportJobsRuntimeRepository,
    @InjectQueue(AGENT_RUNTIME_BRAIN_IMPORT_QUEUE) brainImportQueue?: Queue,
    inputRepository?: BrainImportJobsInputRepository,
  ) {
    super(moduleRef, errorReporter, brainImportQueue, runtimeRepository, inputRepository)
  }
}
