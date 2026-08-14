import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SlackPendingOffer = {
  id: string
  org_id: string
  recipient_person_id: string
  shadow_action_id: string | null
  thread_channel_id: string | null
  thread_ts: string | null
  deliverable_kind: string
  spec: Record<string, unknown>
  status: string
  promised_by: string | null
}

@Injectable()
export class SlackPendingOffersRepository {
  async findById(supabase: SupabaseClient, offerId: string): Promise<SlackPendingOffer | null> {
    const { data, error } = await supabase
      .from('slack_pending_offers')
      .select('*')
      .eq('id', offerId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load Slack offer: ${error.message}`)
    return (data as SlackPendingOffer | null) ?? null
  }

  async create(supabase: SupabaseClient, input: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.from('slack_pending_offers').insert(input)
    if (error) throw new Error(`Failed to create Slack offer: ${error.message}`)
  }

  async expire(supabase: SupabaseClient, orgId: string, before: string): Promise<void> {
    const { error } = await supabase
      .from('slack_pending_offers')
      .update({ status: 'expired' })
      .eq('org_id', orgId)
      .eq('status', 'offered')
      .lt('created_at', before)
    if (error) throw new Error(`Failed to expire Slack offers: ${error.message}`)
  }

  async acceptByThread(
    supabase: SupabaseClient,
    input: { orgId: string; channelId: string; threadTs: string; via: 'reaction' | 'thread_reply' },
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('slack_pending_offers')
      .update({ status: 'accepted', accepted_via: input.via })
      .eq('org_id', input.orgId)
      .eq('thread_channel_id', input.channelId)
      .eq('thread_ts', input.threadTs)
      .eq('status', 'offered')
      .select('id')
      .maybeSingle()
    if (error) throw new Error(`Failed to accept Slack offer: ${error.message}`)
    return data?.id ? String(data.id) : null
  }

  async claimAccepted(
    supabase: SupabaseClient,
    offerId: string,
  ): Promise<SlackPendingOffer | null> {
    const { data, error } = await supabase
      .from('slack_pending_offers')
      .update({ status: 'in_progress' })
      .eq('id', offerId)
      .eq('status', 'accepted')
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`Failed to claim Slack offer: ${error.message}`)
    return (data as SlackPendingOffer | null) ?? null
  }

  async evidence(
    supabase: SupabaseClient,
    offer: SlackPendingOffer,
  ): Promise<{ userId: string; lines: string[] }> {
    const { data: action, error: actionError } = await supabase
      .from('slack_shadow_actions')
      .select('user_id,proposed_content,metadata')
      .eq('id', offer.shadow_action_id ?? '')
      .maybeSingle()
    if (actionError) throw new Error(`Failed to load offer evidence: ${actionError.message}`)
    const metadata =
      action?.metadata && typeof action.metadata === 'object'
        ? (action.metadata as Record<string, unknown>)
        : {}
    const lines = [
      action?.proposed_content,
      metadata.source_message_text,
      metadata.signal_finding,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    const { data: openItems } = await supabase
      .from('agent_cases')
      .select('summary,client_label,status,first_seen_at')
      .eq('org_id', offer.org_id)
      .order('last_activity_at', { ascending: false })
      .limit(12)
    for (const item of openItems ?? [])
      lines.push(`${item.client_label ?? 'Slack'}: ${item.summary} [${item.status}]`)
    return { userId: String(action?.user_id ?? ''), lines }
  }

  async markDelivered(
    supabase: SupabaseClient,
    offerId: string,
    artifactRef: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('slack_pending_offers')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        artifact_ref: artifactRef,
      })
      .eq('id', offerId)
      .eq('status', 'in_progress')
    if (error) throw new Error(`Failed to complete Slack offer: ${error.message}`)
  }

  async listPastDue(supabase: SupabaseClient, nowIso: string): Promise<SlackPendingOffer[]> {
    const { data, error } = await supabase
      .from('slack_pending_offers')
      .select('*')
      .in('status', ['accepted', 'in_progress'])
      .lt('promised_by', nowIso)
      .limit(50)
    if (error) throw new Error(`Failed to load missed Slack offers: ${error.message}`)
    return (data as SlackPendingOffer[] | null) ?? []
  }

  async markMissed(supabase: SupabaseClient, offerId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('slack_pending_offers')
      .update({ status: 'missed' })
      .eq('id', offerId)
      .in('status', ['accepted', 'in_progress'])
      .select('id')
      .maybeSingle()
    if (error) throw new Error(`Failed to mark Slack offer missed: ${error.message}`)
    return Boolean(data?.id)
  }
}
