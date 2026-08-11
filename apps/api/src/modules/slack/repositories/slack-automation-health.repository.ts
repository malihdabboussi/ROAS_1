import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SlackAutomationHealthRepository {
  async listRecentRuns(supabase: SupabaseClient, orgId: string, since: string) {
    const { data, error } = await supabase
      .from('space_automation_runs')
      .select('status, skipped_reason, delivery_outcomes, actions_executed, created_at')
      .eq('org_id', orgId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to load automation health: ${error.message}`)
    return (data ?? []) as Array<Record<string, unknown>>
  }
}
