import { Injectable, Logger } from '@nestjs/common'
import { buildInteractionDedupeKey, CUSTOMER_INTERACTION_ROUTE_EVENT } from '@vibey/api-shared'
import { compactMeetingSource } from '../../../brain/services/brain-import-jobs-meeting-input'
import { BrainImportJobsService } from '../../../brain/services/brain-import-jobs.service'
import { CustomerBrainService } from '../../../brain/services/customer-brain.service'
import { SpaceAutomationService } from '../../../spaces/services/space-automation.service'
import { MeetingProviderRegistry } from '../../providers/meeting-provider.registry'
import { buildTranscriptEnvelope } from '../../providers/transcript-envelope'
import type {
  IntakeSpaceRoute,
  MeetingConnection,
  ProviderContext,
  TranscriptProvider,
  WebhookHeaders,
} from '../../providers/transcript-provider.contract'
import {
  isMeetingProviderId,
  type MeetingProviderId,
  type TranscriptSourceEvent,
} from '../../providers/transcript-source.types'
import { WEBHOOK_KEY_PATTERN } from '../../providers/webhook-key'
import { MeetingIntakeRepository } from '../repositories/meeting-intake.repository'
import { MeetingWebhookDeliveriesRepository } from '../repositories/meeting-webhook-deliveries.repository'

const ORG_BILLING_ROLES = ['owner', 'admin', 'creator', 'editor'] as const

export type IntakeHttpResult = { status: number; body: Record<string, unknown> }

export type IntakeResult =
  | { status: 'skipped'; reason: string }
  | {
      status: 'processed'
      hasTranscript: boolean
      brainJobId: string | null
      spaceRoute: IntakeSpaceRoute
    }

export type AutoIngestSettings = {
  autoIngest: boolean
  billingScope: 'personal' | 'org'
  billingOrgId: string | null
}

/**
 * One intake for every note taker. Webhook deliveries enter through
 * `handleWebhook`; manual and legacy paths enter through `intakeForUser`.
 * Both end in `intake`, which fans a normalized transcript out to the brain,
 * the customer-brain outbox and the Meetings space.
 */
@Injectable()
export class MeetingIntakeService {
  private readonly logger = new Logger(MeetingIntakeService.name)

  constructor(
    private readonly registry: MeetingProviderRegistry,
    private readonly repository: MeetingIntakeRepository,
    private readonly deliveries: MeetingWebhookDeliveriesRepository,
    private readonly importJobs: BrainImportJobsService,
    private readonly customerBrain: CustomerBrainService,
    private readonly spaceAutomation: SpaceAutomationService,
  ) {}

  async handleWebhook(input: {
    provider: string
    connectionKey: string
    rawBody: Buffer
    headers: WebhookHeaders
  }): Promise<IntakeHttpResult> {
    if (!isMeetingProviderId(input.provider) || !WEBHOOK_KEY_PATTERN.test(input.connectionKey)) {
      return { status: 404, body: { success: false, error: 'Unknown webhook' } }
    }
    const provider = this.registry.get(input.provider)
    if (!provider?.push) {
      return { status: 404, body: { success: false, error: 'Unknown webhook' } }
    }
    const connection = await this.repository.findConnectionByWebhookKey(
      input.provider,
      input.connectionKey,
    )
    if (!connection) {
      return { status: 404, body: { success: false, error: 'Unknown webhook' } }
    }

    const ctx = this.buildContext(connection, null)
    const secret = await provider.push.resolveSecret(ctx)
    if (
      !secret ||
      !provider.push.verify({ rawBody: input.rawBody, headers: input.headers, secret })
    ) {
      this.logger.warn(
        `Rejected ${input.provider} webhook for connection ${connection.id}: bad signature`,
      )
      return { status: 401, body: { success: false, error: 'Invalid webhook signature' } }
    }

    const parsed = provider.push.parse(input.rawBody, input.headers)
    if (!parsed) {
      return { status: 400, body: { success: false, error: 'Unreadable webhook body' } }
    }

    if (parsed.ignore) {
      return {
        status: 200,
        body: { success: true, status: 'ignored', eventType: parsed.eventType },
      }
    }

    const claim = await this.deliveries.claim({
      provider: input.provider,
      connectionId: connection.id,
      deliveryId: parsed.deliveryId ?? `${parsed.eventType}:${parsed.externalId}`,
      externalId: parsed.externalId,
    })
    if (!claim.claimed) {
      return { status: 200, body: { success: true, status: 'duplicate' } }
    }

    try {
      const result = await this.intake({
        provider,
        connection,
        externalId: parsed.externalId,
        inlineEvent: parsed.inlineEvent,
      })
      return { status: 202, body: { success: true, ...result } }
    } catch (err) {
      await this.deliveries.release(claim.id).catch(() => undefined)
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(
        `${input.provider} intake failed for connection ${connection.id}: ${message}`,
      )
      return { status: 500, body: { success: false, error: 'Intake failed' } }
    }
  }

  /** Manual import and legacy routes: the caller already knows which user owns the meeting. */
  async intakeForUser(input: {
    provider: MeetingProviderId
    userId: string
    externalId: string
    inlineEvent: Record<string, unknown> | null
  }): Promise<IntakeResult> {
    const provider = this.registry.require(input.provider)
    const connection = await this.repository.findConnectionForUser(input.provider, input.userId)
    if (!connection) return { status: 'skipped', reason: 'not_connected' }
    return this.intake({
      provider,
      connection,
      externalId: input.externalId,
      inlineEvent: input.inlineEvent,
    })
  }

  async intake(input: {
    provider: TranscriptProvider
    connection: MeetingConnection
    externalId: string
    inlineEvent: Record<string, unknown> | null
  }): Promise<IntakeResult> {
    const { provider, connection } = input
    const settings = await this.resolveAutoIngestSettings(connection)
    if (!settings.autoIngest) return { status: 'skipped', reason: 'auto_ingest_disabled' }

    const orgId = settings.billingScope === 'org' ? settings.billingOrgId : null
    const ctx = this.buildContext(connection, orgId)

    const source = provider.pull
      ? await provider.pull.fetch(ctx, input.externalId, input.inlineEvent)
      : provider.normalize(input.inlineEvent ?? {})

    const gate = await provider.hooks?.beforeIntake?.(ctx, { source })
    if (gate && !gate.proceed) {
      return { status: 'skipped', reason: gate.reason ?? 'provider_hook' }
    }

    const hasTranscript = source.transcript.length > 0
    let brainJobId: string | null = null
    if (hasTranscript) {
      brainJobId = await this.enqueueBrainImport(ctx, source)
      await this.enqueueCustomerRoute(ctx, source, settings)
    } else {
      this.logger.warn(
        `No transcript for ${source.provider} recording ${source.externalRecordingId}; continuing Meetings route without brain import`,
      )
    }

    // Meetings call rows must still land even when the provider omits the
    // transcript (Slack follow-up is downstream of the call row).
    const spaceRoute = await this.routeToMeetingsSpace(ctx, source)
    await provider.hooks?.afterSpaceRoute?.(ctx, { source, spaceRoute, hasTranscript })

    return { status: 'processed', hasTranscript, brainJobId, spaceRoute }
  }

  async resolveAutoIngestSettings(connection: MeetingConnection): Promise<AutoIngestSettings> {
    const meta = connection.metadata
    const billingScope = meta.auto_ingest_billing_scope === 'org' ? 'org' : 'personal'
    const billingOrgId =
      billingScope === 'org' && typeof meta.auto_ingest_billing_org_id === 'string'
        ? meta.auto_ingest_billing_org_id
        : null
    if (billingScope === 'org') {
      if (!billingOrgId) throw new Error(`${connection.provider} org billing is missing org id`)
      const role = await this.repository.findActiveOrgMemberRole(connection.userId, billingOrgId)
      if (!role || !ORG_BILLING_ROLES.includes(role as (typeof ORG_BILLING_ROLES)[number])) {
        throw new Error(`${connection.provider} org billing is not authorized for this user`)
      }
    }
    return { autoIngest: meta.auto_ingest !== false, billingScope, billingOrgId }
  }

  private buildContext(connection: MeetingConnection, orgId: string | null): ProviderContext {
    return {
      supabase: this.repository.getServiceClient(),
      userId: connection.userId,
      orgId,
      connection,
    }
  }

  private async enqueueBrainImport(
    ctx: ProviderContext,
    source: TranscriptSourceEvent,
  ): Promise<string | null> {
    const queued = await this.importJobs.enqueueMeetingTranscriptImport(
      ctx.userId,
      { source: compactMeetingSource(source) },
      ctx.orgId,
    )
    return typeof queued?.jobId === 'string' ? queued.jobId : null
  }

  private async enqueueCustomerRoute(
    ctx: ProviderContext,
    source: TranscriptSourceEvent,
    settings: AutoIngestSettings,
  ): Promise<void> {
    const envelope = buildTranscriptEnvelope(source)
    if (!envelope) return
    const customerBrains = await this.customerBrain.listEnabledCustomerBrainsForRouting(
      ctx.userId,
      {
        orgId: ctx.orgId,
      },
    )
    if (customerBrains.length === 0) return
    const meetingId = source.externalRecordingId
    await this.repository.enqueueBrainOpsOutboxRows(
      customerBrains.map((brain) => ({
        brain_id: brain.id,
        user_id: ctx.userId,
        org_id: brain.org_id ?? null,
        event_type: CUSTOMER_INTERACTION_ROUTE_EVENT,
        dedupe_key: buildInteractionDedupeKey(brain.id, meetingId, meetingId),
        payload: {
          source: `${source.provider}_webhook`,
          routing_scope: settings.billingScope,
          routing_org_id: ctx.orgId,
          meeting_id: meetingId,
          envelope,
        },
      })),
    )
  }

  private async routeToMeetingsSpace(
    ctx: ProviderContext,
    source: TranscriptSourceEvent,
  ): Promise<IntakeSpaceRoute> {
    // Phase 0: only Fathom-shaped events reach the Meetings space route;
    // Phase 3 bridges every provider through a normalized recording event.
    if (source.provider !== 'fathom') return null
    try {
      const result = await this.spaceAutomation.processFathomRecordingEvent(
        ctx.supabase,
        ctx.userId,
        source.raw,
      )
      return (result ?? null) as IntakeSpaceRoute
    } catch (err) {
      this.logger.warn(
        `Meetings space route skipped for ${source.provider} ${source.externalRecordingId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      return null
    }
  }
}
