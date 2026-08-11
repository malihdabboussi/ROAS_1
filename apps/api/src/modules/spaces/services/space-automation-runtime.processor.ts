import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Job } from 'bullmq'
import { AGENT_RUNTIME_AUTOMATION_QUEUE } from '../../agent-runtime/agent-runtime-queues'
import { SpaceAutomationRunsRepository } from '../repositories/space-automation-runs.repository'
import { SpaceAutomationService, type TriggerEvent } from './space-automation.service'
import { SlackOfferFulfillmentService } from './slack-offer-fulfillment.service'

const AUTOMATION_CONCURRENCY = readPositiveInt(process.env.AGENT_RUNTIME_AUTOMATION_CONCURRENCY, 5)

type AutomationRuntimeJobData = {
  mode?: 'item' | 'itemless' | 'offer_fulfillment'
  automationId?: string
  event?: TriggerEvent
  userId?: string
  orgId?: string | null
  spaceId?: string
  itemId?: string
  depth?: number
  afterComplete?: { externalEventId?: unknown; patch?: Record<string, unknown> }
  offerId?: string
}

@Processor(AGENT_RUNTIME_AUTOMATION_QUEUE, {
  concurrency: AUTOMATION_CONCURRENCY,
  lockDuration: 5_000_000,
  stalledInterval: 120_000,
})
export class SpaceAutomationRuntimeProcessor extends WorkerHost {
  private readonly logger = new Logger(SpaceAutomationRuntimeProcessor.name)
  private adminClient: SupabaseClient | null = null

  constructor(
    private readonly automationService: SpaceAutomationService,
    private readonly configService: ConfigService,
    private readonly offerFulfillment: SlackOfferFulfillmentService,
    private readonly automationRunsRepo: SpaceAutomationRunsRepository = new SpaceAutomationRunsRepository(),
  ) {
    super()
  }

  async process(job: Job<AutomationRuntimeJobData>): Promise<void> {
    if (job.data?.mode === 'offer_fulfillment' && job.data.offerId) {
      await this.offerFulfillment.fulfill(this.getAdminClient(), job.data.offerId)
      return
    }
    const automationId = String(job.data?.automationId ?? '').trim()
    const userId = String(job.data?.userId ?? '').trim()
    const spaceId = String(job.data?.spaceId ?? '').trim()
    const event = job.data?.event
    if (!automationId || !userId || !spaceId || !event) {
      this.logger.warn(`Skipping automation runtime job ${job.id}: missing required data`)
      return
    }

    const input = {
      automationId,
      event,
      userId,
      orgId: job.data.orgId ?? null,
      spaceId,
      itemId: String(job.data.itemId ?? ''),
      depth: Number(job.data.depth ?? 0),
      supabase: this.getAdminClient(),
    }
    if (job.data.mode === 'itemless') {
      await this.automationService.executeQueuedItemlessAutomation(input)
      return
    }
    const resultItemId = await this.automationService.executeQueuedAutomation(input)
    const externalEventId = job.data.afterComplete?.externalEventId
    if (externalEventId) {
      await this.automationService.completeQueuedExternalEvent(
        input.supabase,
        externalEventId,
        job.data.afterComplete?.patch ?? {},
        resultItemId,
      )
    }
  }

  private getAdminClient(): SupabaseClient {
    if (this.adminClient) return this.adminClient
    this.adminClient = this.automationRunsRepo.createServiceRoleClient(this.configService, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    return this.adminClient
  }
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
