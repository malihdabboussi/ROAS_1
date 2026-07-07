import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentFeedbackLookupTarget } from '../dto/agent-feedback.dto'

export interface AgentTurnFeedbackSummary {
  total_count: number
  positive_count: number
  negative_count: number
  trusted_negative_count: number
  top_tags: string[]
}

@Injectable()
export class AgentFeedbackRepository {
  async findConversationMessage(supabase: SupabaseClient, messageId: string): Promise<any> {
    const { data, error } = await supabase
      .from('messages')
      .select(
        'id, conversation_id, role, metadata, created_at, conversations!inner(id, user_id, org_id, agent_id, campaign_id)',
      )
      .eq('id', messageId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async findSpaceItemActivity(supabase: SupabaseClient, activityId: string): Promise<any> {
    const { data, error } = await supabase
      .from('space_item_activity')
      .select('*')
      .eq('id', activityId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async findMissionLog(supabase: SupabaseClient, logId: string): Promise<any> {
    const { data, error } = await supabase
      .from('missions_logs')
      .select('*')
      .eq('id', logId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async upsertFeedback(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<any> {
    const { data, error } = await supabase
      .from('agent_turn_feedback')
      .upsert(payload, { onConflict: 'user_id,target_kind,target_id' })
      .select('*')
      .single()
    if (error) throw new BadRequestException(error.message)
    return data
  }

  async lookupFeedback(
    supabase: SupabaseClient,
    userId: string,
    targets: AgentFeedbackLookupTarget[],
  ): Promise<any[]> {
    const targetIds = [...new Set(targets.map((target) => target.target_id))]
    const targetKeys = new Set(
      targets.map((target) => `${target.target_kind}:${target.target_id}`),
    )
    const { data, error } = await supabase
      .from('agent_turn_feedback')
      .select('*')
      .eq('user_id', userId)
      .in('target_id', targetIds)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []).filter((row: Record<string, unknown>) =>
      targetKeys.has(`${row.target_kind}:${row.target_id}`),
    )
  }

  static summarizeRows(rows: Array<Record<string, unknown>>): AgentTurnFeedbackSummary {
    const totalCount = rows.length
    const negativeRows = rows.filter((row) => row.thumbs_up === false)
    const tags = new Map<string, number>()
    for (const row of rows) {
      const rawTags = Array.isArray(row.tags) ? row.tags : []
      for (const tag of rawTags) {
        if (typeof tag !== 'string') continue
        tags.set(tag, (tags.get(tag) ?? 0) + 1)
      }
    }
    const trustedNegativeCount = negativeRows.filter((row) => {
      const text = typeof row.feedback_text === 'string' ? row.feedback_text.trim() : ''
      const rowTags = Array.isArray(row.tags) ? row.tags : []
      return text.length > 0 || rowTags.length > 0
    }).length

    return {
      total_count: totalCount,
      positive_count: rows.filter((row) => row.thumbs_up === true).length,
      negative_count: negativeRows.length,
      trusted_negative_count: trustedNegativeCount,
      top_tags: [...tags.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([tag]) => tag),
    }
  }
}
