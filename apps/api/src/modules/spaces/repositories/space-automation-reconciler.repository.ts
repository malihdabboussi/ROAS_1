import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ReconcilerSpaceItemRow = {
  id: string
  space_id: string
  user_id: string
  org_id: string | null
  status: string
  linked_mission_id: string
}

@Injectable()
export class SpaceAutomationReconcilerRepository {
  constructor(private readonly configService: ConfigService) {}

  getServiceClient(): SupabaseClient | null {
    const url = this.configService.get<string>('SUPABASE_URL')
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) return null
    return createClient(url, key)
  }

  getServiceClientForUser(): SupabaseClient {
    const url = this.configService.get<string>('SUPABASE_URL')!
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!
    return createClient(url, key)
  }

  async listLinkedItemsUpdatedSince(
    supabase: SupabaseClient,
    since: string,
  ): Promise<{ items: ReconcilerSpaceItemRow[]; errorMessage: string | null }> {
    const { data, error } = await supabase
      .from('space_items')
      .select('id, space_id, user_id, org_id, status, linked_mission_id')
      .not('linked_mission_id', 'is', null)
      .gte('updated_at', since)
      .limit(50)
    return {
      items: (data ?? []) as ReconcilerSpaceItemRow[],
      errorMessage: error?.message ?? null,
    }
  }

  async findMissionStatus(supabase: SupabaseClient, missionId: string) {
    const { data } = await supabase
      .from('missions')
      .select('id, status')
      .eq('id', missionId)
      .maybeSingle()
    return (data ?? null) as { id: string; status: string } | null
  }

  async hasRecentRun(supabase: SupabaseClient, itemId: string, triggerType: string) {
    const since = new Date(Date.now() - 5 * 60_000).toISOString()
    const { count } = await supabase
      .from('space_automation_runs')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', itemId)
      .gte('created_at', since)
      .contains('trigger_event', { type: triggerType })
    return (count ?? 0) > 0
  }
}
