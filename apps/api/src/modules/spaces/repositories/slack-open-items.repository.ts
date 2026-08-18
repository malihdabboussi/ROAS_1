import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlackOpenItem } from './slack-open-items.types'

export type { SlackOpenItem } from './slack-open-items.types'

@Injectable()
export class SlackOpenItemsRepository {
  async upsert(
    supabase: SupabaseClient,
    input: Omit<
      SlackOpenItem,
      'id' | 'status' | 'times_surfaced' | 'last_surfaced_at' | 'resolution_note'
    >,
  ): Promise<void> {
    const { data: existing, error: loadError } = await supabase
      .from('agent_cases')
      .select('id, metadata')
      .eq('org_id', input.org_id)
      .eq('source_type', input.source_type)
      .eq('source_key', input.source_key)
      .maybeSingle()
    if (loadError) throw new Error(`Failed to load agent case: ${loadError.message}`)
    if (existing?.id) {
      const existingMetadata =
        existing.metadata && typeof existing.metadata === 'object'
          ? (existing.metadata as Record<string, unknown>)
          : {}
      const { error } = await supabase
        .from('agent_cases')
        .update({
          scope_level: input.scope_level,
          program_id: input.program_id,
          campaign_id: input.campaign_id,
          space_id: input.space_id,
          external_client_id: input.external_client_id,
          subject_person_id: input.subject_person_id,
          client_label: input.client_label,
          summary: input.summary,
          severity: input.severity,
          last_activity_at: input.last_activity_at,
          due_at: input.due_at,
          metadata: { ...existingMetadata, ...input.metadata },
        })
        .eq('id', existing.id)
      if (error) throw new Error(`Failed to update agent case: ${error.message}`)
      return
    }
    const { error } = await supabase.from('agent_cases').insert(input)
    if (error) throw new Error(`Failed to create agent case: ${error.message}`)
  }

  async resolveSlackScope(
    supabase: SupabaseClient,
    input: { orgId: string; channelId: string; metadata: Record<string, unknown> },
  ): Promise<{
    scope_level: 'company' | 'client' | 'campaign'
    program_id: string | null
    campaign_id: string | null
    space_id: string | null
    client_label: string | null
    external_client_id: string | null
  }> {
    const metadataCampaignId =
      this.optionalUuid(input.metadata.roas_campaign_id) ??
      this.optionalUuid(input.metadata.page_grader_campaign_id)
    let campaignId = metadataCampaignId
    if (!campaignId) {
      const { data, error } = await supabase
        .from('slack_brain_mappings')
        .select('target_campaign_id')
        .eq('org_id', input.orgId)
        .eq('slack_channel_id', input.channelId)
        .eq('target_kind', 'campaign')
        .eq('enabled', true)
        .not('target_campaign_id', 'is', null)
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`Failed to resolve Slack case scope: ${error.message}`)
      campaignId = this.optionalUuid(data?.target_campaign_id)
    }
    if (!campaignId) {
      return {
        scope_level: 'company',
        program_id: null,
        campaign_id: null,
        space_id: null,
        client_label: this.optionalString(input.metadata.page_grader_client_name),
        external_client_id: this.optionalString(input.metadata.page_grader_client_id),
      }
    }
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('id, name, program_id')
      .eq('id', campaignId)
      .eq('org_id', input.orgId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw new Error(`Failed to load Slack case campaign: ${error.message}`)
    return {
      scope_level: campaign?.id ? 'client' : 'company',
      program_id: this.optionalUuid(campaign?.program_id),
      campaign_id: campaign?.id ? String(campaign.id) : null,
      space_id: this.optionalUuid(input.metadata.roas_space_id),
      client_label:
        this.optionalString(input.metadata.page_grader_client_name) ??
        this.optionalString(campaign?.name),
      external_client_id: this.optionalString(input.metadata.page_grader_client_id),
    }
  }

  async resolveExternalScope(
    supabase: SupabaseClient,
    input: {
      orgId: string
      campaignId?: string | null
      spaceId?: string | null
      externalCampaignId?: string | null
      clientLabel?: string | null
      externalClientId?: string | null
    },
  ): Promise<{
    scope_level: 'company' | 'client' | 'campaign'
    program_id: string | null
    campaign_id: string | null
    space_id: string | null
    client_label: string | null
    external_client_id: string | null
  }> {
    let campaignId = this.optionalUuid(input.campaignId)
    let spaceId = this.optionalUuid(input.spaceId)
    if (spaceId && !campaignId) {
      const { data, error } = await supabase
        .from('spaces')
        .select('id, campaign_id')
        .eq('id', spaceId)
        .eq('org_id', input.orgId)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) throw new Error(`Failed to resolve external case Space: ${error.message}`)
      if (!data?.id) spaceId = null
      campaignId = this.optionalUuid(data?.campaign_id)
    }
    if (!spaceId && campaignId && input.externalCampaignId) {
      const { data, error } = await supabase
        .from('spaces')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('schema->custom_data->>page_grader_campaign_id', input.externalCampaignId)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()
      if (error) throw new Error(`Failed to resolve external campaign Space: ${error.message}`)
      spaceId = this.optionalUuid(data?.id)
    }
    if (!campaignId) {
      return {
        scope_level: 'company',
        program_id: null,
        campaign_id: null,
        space_id: spaceId,
        client_label: input.clientLabel ?? null,
        external_client_id: input.externalClientId ?? null,
      }
    }
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('id, name, program_id')
      .eq('id', campaignId)
      .eq('org_id', input.orgId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve external case campaign: ${error.message}`)
    return {
      scope_level: spaceId ? 'campaign' : campaign?.id ? 'client' : 'company',
      program_id: this.optionalUuid(campaign?.program_id),
      campaign_id: campaign?.id ? String(campaign.id) : null,
      space_id: spaceId,
      client_label: input.clientLabel ?? this.optionalString(campaign?.name),
      external_client_id: input.externalClientId ?? null,
    }
  }

  async listDueForResolution(
    supabase: SupabaseClient,
    orgId: string,
    checkedBefore: string,
  ): Promise<SlackOpenItem[]> {
    const { data, error } = await supabase
      .from('agent_cases')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'open')
      .eq('source_type', 'slack_message')
      .or(
        `metadata->>resolution_checked_at.is.null,metadata->>resolution_checked_at.lt.${checkedBefore}`,
      )
      .order('first_seen_at', { ascending: true })
      .limit(100)
    if (error) throw new Error(`Failed to load Slack open items: ${error.message}`)
    return (data as SlackOpenItem[] | null) ?? []
  }

  async saveResolution(
    supabase: SupabaseClient,
    item: SlackOpenItem,
    input: { resolved: boolean; note: string; checkedAt: string },
  ): Promise<void> {
    const { error } = await supabase
      .from('agent_cases')
      .update({
        status: input.resolved
          ? item.case_type === 'unanswered_ask'
            ? 'answered'
            : 'resolved'
          : 'open',
        resolution_note: input.resolved ? input.note : null,
        last_activity_at: input.resolved ? input.checkedAt : item.last_activity_at,
        metadata: { ...item.metadata, resolution_checked_at: input.checkedAt },
      })
      .eq('id', item.id)
      .eq('status', 'open')
    if (error) throw new Error(`Failed to resolve Slack open item: ${error.message}`)
  }

  async listContinuity(
    supabase: SupabaseClient,
    input: { orgId: string; subjectPersonId?: string; resolvedSince: string },
  ): Promise<SlackOpenItem[]> {
    let query = supabase
      .from('agent_cases')
      .select('*')
      .eq('org_id', input.orgId)
      .or(`status.eq.open,and(status.in.(answered,resolved),updated_at.gte.${input.resolvedSince})`)
      .order('first_seen_at', { ascending: true })
      .limit(100)
    if (input.subjectPersonId) query = query.eq('subject_person_id', input.subjectPersonId)
    const { data, error } = await query
    if (error) throw new Error(`Failed to load Slack continuity: ${error.message}`)
    return (data as SlackOpenItem[] | null) ?? []
  }

  async listUnnotifiedBreaches(
    supabase: SupabaseClient,
    orgId: string,
    nowIso: string,
  ): Promise<SlackOpenItem[]> {
    const { data, error } = await supabase
      .from('agent_cases')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'open')
      .is('breach_notified_at', null)
      .not('due_at', 'is', null)
      .lte('due_at', nowIso)
      .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`)
      .order('due_at', { ascending: true })
      .limit(100)
    if (error) throw new Error(`Failed to load breached agent cases: ${error.message}`)
    return (data as SlackOpenItem[] | null) ?? []
  }

  async markBreachNotified(
    supabase: SupabaseClient,
    caseId: string,
    notifiedAt: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('agent_cases')
      .update({ breach_notified_at: notifiedAt })
      .eq('id', caseId)
      .is('breach_notified_at', null)
    if (error) throw new Error(`Failed to mark agent case breach: ${error.message}`)
  }

  async findQcSlackAnchor(
    supabase: SupabaseClient,
    input: {
      orgId: string
      sourceType: string
      caseTypes: string[]
      sinceIso: string
      campaignId?: string | null
      externalClientId?: string | null
      clientLabel?: string | null
      sourceKeys?: string[]
    },
  ): Promise<SlackOpenItem | null> {
    const { data, error } = await supabase
      .from('agent_cases')
      .select('*')
      .eq('org_id', input.orgId)
      .eq('source_type', input.sourceType)
      .in('case_type', input.caseTypes)
      .in('status', ['open', 'acknowledged', 'snoozed', 'resolved'])
      .gte('last_activity_at', input.sinceIso)
      .not('metadata->>slack_parent_ts', 'is', null)
      .order('first_seen_at', { ascending: true })
      .limit(200)
    if (error) throw new Error(`Failed to load QC Slack thread: ${error.message}`)
    const match = ((data as SlackOpenItem[] | null) ?? []).find((item) => {
      const parentTs =
        typeof item.metadata.slack_parent_ts === 'string' ? item.metadata.slack_parent_ts.trim() : ''
      return parentTs.length > 0 && this.matchesQcSlackScope(item, input)
    })
    return match ?? null
  }

  async attachSlackDelivery(
    supabase: SupabaseClient,
    input: {
      orgId: string
      sourceType: string
      sourceKeys: string[]
      channelId: string
      parentTs: string
      fingerprint: string
      followedUpAt: string
    },
  ): Promise<void> {
    if (!input.sourceKeys.length) return
    const { data, error } = await supabase
      .from('agent_cases')
      .select('id, metadata')
      .eq('org_id', input.orgId)
      .eq('source_type', input.sourceType)
      .in('source_key', input.sourceKeys)
    if (error) throw new Error(`Failed to load QC Slack delivery cases: ${error.message}`)
    for (const row of data ?? []) {
      const existing =
        row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>)
          : {}
      const { error: updateError } = await supabase
        .from('agent_cases')
        .update({
          channel_id: input.channelId,
          source_message_ts: input.parentTs,
          metadata: {
            ...existing,
            slack_channel: input.channelId,
            slack_parent_ts: input.parentTs,
            slack_finding_fingerprint: input.fingerprint,
            slack_last_follow_up_at: input.followedUpAt,
          },
        })
        .eq('id', row.id)
      if (updateError) throw new Error(`Failed to attach QC Slack thread: ${updateError.message}`)
    }
  }

  async applyExternalAction(
    supabase: SupabaseClient,
    input: {
      orgId: string
      sourceType: string
      sourceKey: string
      action: 'acknowledge' | 'resolve' | 'snooze_tomorrow'
      nowIso: string
    },
  ): Promise<void> {
    const snoozedUntil =
      input.action === 'snooze_tomorrow'
        ? new Date(Date.parse(input.nowIso) + 24 * 60 * 60_000).toISOString()
        : null
    const { error } = await supabase
      .from('agent_cases')
      .update({
        status:
          input.action === 'resolve'
            ? 'resolved'
            : input.action === 'acknowledge'
              ? 'acknowledged'
              : 'snoozed',
        last_activity_at: input.nowIso,
        snoozed_until: snoozedUntil,
        resolution_note:
          input.action === 'resolve' ? 'Resolved from the Page Grader Slack action.' : null,
      })
      .eq('org_id', input.orgId)
      .eq('source_type', input.sourceType)
      .eq('source_key', input.sourceKey)
    if (error) throw new Error(`Failed to update agent case action: ${error.message}`)
  }

  async markSurfaced(supabase: SupabaseClient, item: SlackOpenItem, nowIso: string): Promise<void> {
    const nextCount = item.times_surfaced + 1
    const terminal = item.status === 'open' && nextCount >= 4
    const { error } = await supabase
      .from('agent_cases')
      .update({
        times_surfaced: nextCount,
        last_surfaced_at: nowIso,
        ...(terminal
          ? { status: 'stale', resolution_note: 'Going quiet after four surfaces.' }
          : {}),
        metadata: {
          ...item.metadata,
          ...(item.status === 'answered' || item.status === 'resolved'
            ? { resolution_surfaced_at: nowIso }
            : {}),
        },
      })
      .eq('id', item.id)
    if (error) throw new Error(`Failed to mark Slack continuity surfaced: ${error.message}`)
  }

  async enforceRetention(
    supabase: SupabaseClient,
    orgId: string,
    archiveBefore: string,
  ): Promise<void> {
    const { error: archiveError } = await supabase
      .from('agent_cases')
      .delete()
      .eq('org_id', orgId)
      .in('status', ['answered', 'resolved', 'stale'])
      .lt('updated_at', archiveBefore)
    if (archiveError) throw new Error(`Failed to archive Slack open items: ${archiveError.message}`)

    const { data, error } = await supabase
      .from('agent_cases')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'open')
      .order('first_seen_at', { ascending: false })
      .range(500, 999)
    if (error) throw new Error(`Failed to cap Slack open items: ${error.message}`)
    const overflow = (data ?? []).map((row) => row.id)
    if (overflow.length) {
      const { error: staleError } = await supabase
        .from('agent_cases')
        .update({ status: 'stale', resolution_note: 'Evicted by the 500-open-item retention cap.' })
        .in('id', overflow)
      if (staleError) throw new Error(`Failed to stale Slack open items: ${staleError.message}`)
    }
  }

  private matchesQcSlackScope(
    item: SlackOpenItem,
    input: {
      campaignId?: string | null
      externalClientId?: string | null
      clientLabel?: string | null
      sourceKeys?: string[]
    },
  ): boolean {
    if (input.campaignId && item.campaign_id === input.campaignId) return true
    if (input.externalClientId && item.external_client_id === input.externalClientId) return true
    if (
      input.clientLabel &&
      item.client_label &&
      item.client_label.trim().toLowerCase() === input.clientLabel.trim().toLowerCase()
    ) {
      return true
    }
    return Boolean(input.sourceKeys?.includes(item.source_key))
  }

  private optionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  private optionalUuid(value: unknown): string | null {
    const text = this.optionalString(value)
    return text &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
      ? text
      : null
  }
}
