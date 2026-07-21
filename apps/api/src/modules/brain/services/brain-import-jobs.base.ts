import { Logger } from '@nestjs/common'
import type { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Queue } from 'bullmq'
import type { ErrorReporter } from '@vibey/api-shared'
import { BrainImportJobsRuntimeRepository } from '../repositories/brain-import-jobs-runtime.repository'
import type { BrainImportJobRecord } from './brain-import-jobs.types'
import { readPositiveInt } from './brain-import-jobs.types'

export abstract class BrainImportJobsBase {
  static readonly MAX_PAYLOAD_BYTES = 5_000_000
  static readonly MAX_CHUNK_CHARS = 350_000
  static readonly CHUNK_OVERLAP_CHARS = 500
  static readonly BINARY_PAYLOAD_KEYS = new Set([
    'mediaBase64',
    'mediaCaption',
    'mediaMimeType',
    'mediaUrl',
    'assetId',
    'assetRef',
  ])
  static readonly MAX_PROMPT_INPUT_BYTES = 2_000_000

  protected readonly logger = new Logger('BrainImportJobsService')
  protected readonly pollIntervalMs = 3000
  protected readonly maxAttempts = 3
  protected readonly processingBatchSize = readPositiveInt(
    process.env.AGENT_RUNTIME_BRAIN_IMPORT_BATCH_SIZE,
    5,
  )
  protected adminClient: SupabaseClient | null = null
  protected agentApiHealthy = true
  protected healthCheckTimer: NodeJS.Timeout | null = null
  protected readonly HEALTH_CHECK_INTERVAL_MS = 10_000

  constructor(
    protected readonly moduleRef: ModuleRef,
    protected readonly errorReporter: ErrorReporter,
    protected readonly brainImportQueue?: Queue,
    protected readonly runtimeRepository: BrainImportJobsRuntimeRepository = new BrainImportJobsRuntimeRepository(),
  ) {}

  protected startHealthMonitor() {
    if (this.healthCheckTimer) return
    this.healthCheckTimer = setInterval(() => {
      void this.probeAgentApiHealth()
    }, this.HEALTH_CHECK_INTERVAL_MS)
  }

  protected stopHealthMonitor() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  protected async probeAgentApiHealth(): Promise<void> {
    const url = (process.env.AGENT_API_URL ?? '').trim()
    if (!url) return
    const wasHealthy = this.agentApiHealthy
    try {
      // App-level liveness only: this does not carry user data, so no Fly machine pin is needed.
      const res = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(5000),
      })
      this.agentApiHealthy = res.ok
    } catch {
      this.agentApiHealthy = false
    }
    if (!wasHealthy && this.agentApiHealthy) {
      this.logger.log('Agent-api recovered -- waking retry jobs immediately')
      void this.wakeRetryJobs()
    }
  }

  protected async wakeRetryJobs(): Promise<void> {
    const admin = this.getAdminClient()
    const { data: retryJobs, error: fetchError } = await this.runtimeRepository.findRetryJobs(
      admin,
      50,
    )
    if (fetchError || !retryJobs?.length) return

    for (const job of retryJobs) {
      const jitterMs = Math.floor(Math.random() * 30_000)
      const { error } = await this.runtimeRepository.wakeRetryJob(
        admin,
        job.id,
        new Date(Date.now() + jitterMs).toISOString(),
      )
      if (error) {
        this.logger.warn(`Failed to wake retry job ${job.id}: ${error.message}`)
      }
    }
  }

  protected getGateway() {
    const {
      MissionAgentGatewayService,
    } = require('../../missions/services/gateways/mission-agent-gateway.service')
    return this.moduleRef.get(MissionAgentGatewayService, { strict: false })
  }

  protected async markSlackMappingSynced(job: BrainImportJobRecord): Promise<void> {
    const payload = job.payload as Record<string, unknown>
    if (payload.isFork) return
    const mappingId = String(payload.mappingId ?? '')
    if (!mappingId) return
    const admin = this.getAdminClient()
    const update: Record<string, unknown> = { last_synced_at: new Date().toISOString() }
    if (typeof payload.periodEndTs === 'string') update.last_message_ts = payload.periodEndTs
    const { error } = await this.runtimeRepository.updateSlackMappingSynced(
      admin,
      mappingId,
      update,
    )
    if (error) throw new Error(error.message)
  }

  protected getSlackService() {
    const { SlackService } = require('../../slack/services/slack.service')
    return this.moduleRef.get(SlackService, { strict: false })
  }

  protected getSlackSenderResolver() {
    const {
      SlackSenderResolverService,
    } = require('../../slack/services/slack-sender-resolver.service')
    return this.moduleRef.get(SlackSenderResolverService, { strict: false })
  }

  protected getSlackObservationService() {
    const { SlackObservationService } = require('../../slack/services/slack-observation.service')
    return this.moduleRef.get(SlackObservationService, { strict: false })
  }

  protected getCustomerBrainService() {
    const { CustomerBrainService } = require('./customer-brain.service')
    return this.moduleRef.get(CustomerBrainService, { strict: false })
  }

  // ── Cross-Pollination ──────────────────────────────────────────────────

  protected async triggerCrossPollination(job: BrainImportJobRecord): Promise<void> {
    const { BrainCrossPollinatorService } = require('./brain-cross-pollinator.service')
    const crossPollinator = this.moduleRef.get(BrainCrossPollinatorService, { strict: false })
    if (!crossPollinator) {
      this.logger.warn('BrainCrossPollinatorService not available')
      return
    }
    const admin = this.getAdminClient()
    const orgId = await this.runtimeRepository.findJobOrgId(admin, job.id)
    await crossPollinator.analyzeCrossPollination(job, orgId as string | null)
  }

  // ── Utilities ───────────────────────────────────────────────────────────

  protected getAdminClient(): SupabaseClient {
    if (!this.adminClient) this.adminClient = this.runtimeRepository.getAdminClient()
    return this.adminClient
  }

  protected getBackoffMs(attempts: number): number {
    if (attempts <= 1) return 60 * 60 * 1000
    if (attempts === 2) return 3 * 60 * 60 * 1000
    return 3 * 60 * 60 * 1000
  }

  protected hashKey(input: string): string {
    let hash = 0
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i)
      hash |= 0
    }
    return String(Math.abs(hash))
  }

  protected isCreditsExhaustedError(message: string): boolean {
    const normalized = message.toLowerCase()
    return (
      normalized.includes('credits_exhausted') || normalized.includes('agent request failed (402)')
    )
  }
}
