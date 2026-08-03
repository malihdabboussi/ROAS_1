import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlackShadowAction } from '../../slack/types/slack.types'

@Injectable()
export class SlackTeamLoopRepository {
  async listCoolingActions(
    supabase: SupabaseClient,
    input: { orgId: string; workflowKey: string; limit?: number },
  ): Promise<SlackShadowAction[]> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .select('*')
      .eq('org_id', input.orgId)
      .eq('workflow_key', input.workflowKey)
      .eq('status', 'proposed')
      .contains('metadata', { lifecycle_state: 'cooling' })
      .order('created_at', { ascending: true })
      .limit(input.limit ?? 100)
    if (error) throw new Error(`Failed to load cooling Slack actions: ${error.message}`)
    return (data as SlackShadowAction[] | null) ?? []
  }

  async updateActionMetadata(
    supabase: SupabaseClient,
    input: {
      actionId: string
      orgId: string
      metadata: Record<string, unknown>
    },
  ): Promise<SlackShadowAction | null> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .update({ metadata: input.metadata })
      .eq('id', input.actionId)
      .eq('org_id', input.orgId)
      .eq('status', 'proposed')
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`Failed to update Slack action lifecycle: ${error.message}`)
    return (data as SlackShadowAction | null) ?? null
  }

  async findRecentDigestRoot(
    supabase: SupabaseClient,
    input: {
      orgId: string
      workflowKey: string
      targetMemberId: string
      sinceIso: string
    },
  ): Promise<{ channelId: string; threadTs: string } | null> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .select('metadata,sent_at')
      .eq('org_id', input.orgId)
      .eq('workflow_key', input.workflowKey)
      .eq('target_member_id', input.targetMemberId)
      .eq('status', 'sent')
      .contains('metadata', { digest_is_root: true })
      .gte('sent_at', input.sinceIso)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to load Slack digest root: ${error.message}`)
    const metadata =
      data && typeof data.metadata === 'object' && data.metadata !== null
        ? (data.metadata as Record<string, unknown>)
        : null
    const channelId =
      typeof metadata?.slack_channel_id === 'string' ? metadata.slack_channel_id.trim() : ''
    const threadTs =
      typeof metadata?.digest_thread_ts === 'string'
        ? metadata.digest_thread_ts.trim()
        : typeof metadata?.slack_message_ts === 'string'
          ? metadata.slack_message_ts.trim()
          : ''
    if (!channelId || !threadTs) return null
    return { channelId, threadTs }
  }

  async countActionsSince(
    supabase: SupabaseClient,
    input: { orgId: string; workflowKey: string; since: string },
  ): Promise<number> {
    const { count, error } = await supabase
      .from('slack_shadow_actions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', input.orgId)
      .eq('workflow_key', input.workflowKey)
      .gte('created_at', input.since)
    if (error) throw new Error(`Failed to count Slack loop actions: ${error.message}`)
    return count ?? 0
  }

  async hasEvidenceFingerprint(
    supabase: SupabaseClient,
    input: { orgId: string; evidenceFingerprint: string },
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .select('id')
      .eq('org_id', input.orgId)
      .contains('metadata', { evidence_fingerprint: input.evidenceFingerprint })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to check Slack loop evidence: ${error.message}`)
    return Boolean(data?.id)
  }

  async insertPersonMemory(
    supabase: SupabaseClient,
    input: {
      brainId: string
      content: string
      speaker: string
      sourceChannelId: string
      sourceMessageTs: string
      confidence: number
      metadata: Record<string, unknown>
    },
  ): Promise<{ id: string; created: boolean }> {
    const sourceId = `${input.sourceChannelId}:${input.sourceMessageTs}`
    const contentHash = createHash('sha256')
      .update(`${input.brainId}:${input.content.trim().toLowerCase()}`)
      .digest('hex')
    const { data: sourceMemory, error: sourceFindError } = await supabase
      .from('ns_memories')
      .select('id')
      .eq('brain_id', input.brainId)
      .eq('source_id', sourceId)
      .limit(1)
      .maybeSingle()
    if (sourceFindError) {
      throw new Error(`Failed to check Person Brain source memory: ${sourceFindError.message}`)
    }
    if (sourceMemory?.id) return { id: String(sourceMemory.id), created: false }

    const { data: contentMemory, error: contentFindError } = await supabase
      .from('ns_memories')
      .select('id')
      .eq('brain_id', input.brainId)
      .eq('content_hash', contentHash)
      .limit(1)
      .maybeSingle()
    if (contentFindError) {
      throw new Error(`Failed to check Person Brain memory: ${contentFindError.message}`)
    }
    if (contentMemory?.id) return { id: String(contentMemory.id), created: false }

    const { data, error } = await supabase
      .from('ns_memories')
      .insert({
        brain_id: input.brainId,
        content: input.content,
        content_hash: contentHash,
        memory_type: 'fact',
        source_type: 'api',
        source_id: sourceId,
        source_title: `Slack #${input.sourceChannelId}`,
        speaker: input.speaker,
        confidence: input.confidence,
        significance: 0.6,
        tags: ['slack', 'managed_person', 'automatic_observation'],
        agent_id: 'pixel',
        metadata: input.metadata,
      })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to compound Person Brain: ${error.message}`)
    return { id: String(data.id), created: true }
  }
}
