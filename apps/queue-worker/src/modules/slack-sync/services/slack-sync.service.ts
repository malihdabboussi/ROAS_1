import { Injectable, Logger, Optional } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'
import { QueueLoggerService } from '../../logger'
import { normalizeSlackTimestamp } from '../utils/normalize-slack-timestamp'

type SlackBrainMapping = {
  id: string
  user_id: string
  org_id: string | null
  slack_team_id: string
  slack_channel_id: string
  slack_channel_name: string
  target_kind: string
  target_brain_id: string | null
  target_campaign_id: string | null
  cadence: 'daily' | 'weekly' | 'monthly'
  last_synced_at: string | null
  created_at: string
}

@Injectable()
export class SlackSyncService {
  private readonly logger = new Logger(SlackSyncService.name)
  /** Spread Atlas OpenClaw calls so daily Slack backfills do not trip provider rate limits. */
  private static readonly ENQUEUE_STAGGER_MS = 20_000

  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() private readonly queueLogger?: QueueLoggerService,
  ) {}

  async enqueueDueMappings(): Promise<number> {
    const supabase = this.databaseService.getClient()
    const { data, error } = await supabase
      .from('slack_brain_mappings')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) {
      this.logger.error(`Failed to fetch Slack brain mappings: ${error.message}`)
      void this.queueLogger?.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'slack_sync_service',
        error_code: 'SLACK_SYNC_MAPPING_FETCH_FAILED',
        message: `Failed to fetch Slack brain mappings: ${error.message}`,
        context: { table: 'slack_brain_mappings' },
      })
      return 0
    }

    let enqueued = 0
    const now = new Date()
    for (const mapping of ((data ?? []) as SlackBrainMapping[]).filter((row) =>
      this.isDue(row, now),
    )) {
      try {
        const integration = await this.loadIntegration(mapping)
        if (!integration?.access_token) continue
        const metadata = (integration.metadata ?? {}) as Record<string, unknown>
        if (metadata.slack_brain_auto_ingest === false) continue
        const periodStart = normalizeSlackTimestamp(mapping.last_synced_at ?? mapping.created_at)
        const periodEnd = normalizeSlackTimestamp(now.toISOString())
        const dedupeKey = `slack:${mapping.id}:${periodStart}`
        const existing = await supabase
          .from('brain_import_jobs')
          .select('id')
          .eq('user_id', mapping.user_id)
          .eq('dedupe_key', dedupeKey)
          .in('status', ['queued', 'processing', 'retry'])
          .limit(1)
          .maybeSingle()
        if (existing.data?.id) continue
        const nextAttemptAt = new Date(
          now.getTime() + enqueued * SlackSyncService.ENQUEUE_STAGGER_MS,
        ).toISOString()
        const { error: insertError } = await supabase.from('brain_import_jobs').insert({
          user_id: mapping.user_id,
          org_id: mapping.org_id,
          job_type:
            mapping.target_kind === 'campaign' ? 'campaign_slack_import' : 'slack_period_import',
          title: `Slack #${mapping.slack_channel_name} ${mapping.cadence}`,
          dedupe_key: dedupeKey,
          payload: {
            mappingId: mapping.id,
            mappingUserId: mapping.user_id,
            channelId: mapping.slack_channel_id,
            channelName: mapping.slack_channel_name,
            teamId: mapping.slack_team_id,
            periodStartTs: periodStart,
            periodEndTs: periodEnd,
            targetKind: mapping.target_kind,
            targetCampaignId: mapping.target_campaign_id,
            targetBrainId: mapping.target_brain_id,
            contactId: null,
            senderFilterSlackUserId: null,
            isFork: false,
          },
          status: 'queued',
          attempts: 0,
          max_attempts: 3,
          next_attempt_at: nextAttemptAt,
        })
        if (insertError) throw insertError
        enqueued += 1
      } catch (err) {
        this.logger.warn(
          `Slack brain sync enqueue skipped for mapping=${mapping.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    }
    return enqueued
  }

  private async loadIntegration(mapping: SlackBrainMapping): Promise<{
    access_token: string
    metadata: Record<string, unknown>
  } | null> {
    const supabase = this.databaseService.getClient()
    let query = supabase
      .from('user_integrations')
      .select('access_token, metadata')
      .eq('user_id', mapping.user_id)
      .eq('integration_id', 'slack')
      .eq('status', 'connected')
      .eq('metadata->>team_id', mapping.slack_team_id)
    query = mapping.org_id ? query.eq('org_id', mapping.org_id) : query.is('org_id', null)
    const { data, error } = await query.limit(1).maybeSingle()
    if (error) throw new Error(`Failed to load Slack integration: ${error.message}`)
    return (data as { access_token: string; metadata: Record<string, unknown> } | null) ?? null
  }

  private isDue(mapping: SlackBrainMapping, now: Date): boolean {
    if (!mapping.last_synced_at) return true
    const last = new Date(mapping.last_synced_at).getTime()
    if (!Number.isFinite(last)) return true
    const cadenceMs =
      mapping.cadence === 'monthly'
        ? 30 * 24 * 60 * 60 * 1000
        : mapping.cadence === 'weekly'
          ? 7 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000
    return now.getTime() - last >= cadenceMs
  }
}
