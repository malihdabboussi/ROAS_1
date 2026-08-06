import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlackShadowAction } from '../types/slack.types'

@Injectable()
export class SlackDigestEvidenceRepository {
  async listByDigestThread(
    supabase: SupabaseClient,
    input: { orgId: string; threadTs: string; channelId?: string; limit?: number },
  ): Promise<SlackShadowAction[]> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .select(
        'id, agent_key, target_member_id, action_kind, proposed_content, rationale, status, source_channel_id, source_message_ts, workflow_key, reviewed_by, reviewed_at, sent_at, metadata, created_at, updated_at',
      )
      .eq('org_id', input.orgId)
      .eq('status', 'sent')
      .contains('metadata', { digest_thread_ts: input.threadTs })
      .order('sent_at', { ascending: true })
      .limit(input.limit ?? 20)
    if (error) throw new Error(`Failed to load digest evidence: ${error.message}`)
    const rows = (data ?? []) as SlackShadowAction[]
    if (!input.channelId) return rows
    return rows.filter((action) => {
      const metadata =
        action.metadata && typeof action.metadata === 'object'
          ? (action.metadata as Record<string, unknown>)
          : {}
      const slackChannelId =
        typeof metadata.slack_channel_id === 'string' ? metadata.slack_channel_id.trim() : ''
      return !slackChannelId || slackChannelId === input.channelId
    })
  }
}
