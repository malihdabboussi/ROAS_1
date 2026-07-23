import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlackShadowAction } from '../types/slack.types'

export type SlackSignalPlaybookRule = {
  id: string
  instruction: string
}

@Injectable()
export class SlackSignalTrainingRepository {
  async updateSignalMetadata(
    supabase: SupabaseClient,
    input: { actionId: string; orgId: string; metadata: Record<string, unknown> },
  ): Promise<SlackShadowAction | null> {
    const { data, error } = await supabase
      .from('slack_shadow_actions')
      .update({ metadata: input.metadata })
      .eq('id', input.actionId)
      .eq('org_id', input.orgId)
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`Failed to update Slack signal evidence: ${error.message}`)
    return (data as SlackShadowAction | null) ?? null
  }

  async createRule(
    supabase: SupabaseClient,
    input: { orgId: string; userId: string; signalId: string; instruction: string },
  ): Promise<SlackSignalPlaybookRule> {
    const { data, error } = await supabase
      .from('slack_signal_playbook_rules')
      .insert({
        org_id: input.orgId,
        created_by: input.userId,
        source_signal_id: input.signalId,
        instruction: input.instruction,
      })
      .select('id, instruction')
      .single()
    if (error) throw new Error(`Failed to save Slack signal guidance: ${error.message}`)
    return data as SlackSignalPlaybookRule
  }

  async listEnabledRules(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<SlackSignalPlaybookRule[]> {
    const { data, error } = await supabase
      .from('slack_signal_playbook_rules')
      .select('id, instruction')
      .eq('org_id', orgId)
      .eq('is_enabled', true)
      .order('created_at', { ascending: true })
      .limit(50)
    if (error) throw new Error(`Failed to load Slack signal guidance: ${error.message}`)
    return (data ?? []) as SlackSignalPlaybookRule[]
  }
}
