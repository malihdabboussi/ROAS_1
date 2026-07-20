import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SlackPeopleBrainRepository {
  async listDefaultUserBrains(
    supabase: SupabaseClient,
    userIds: string[],
  ): Promise<Array<{ id: string; owner_id: string; name: string | null }>> {
    if (userIds.length === 0) return []
    const { data, error } = await supabase
      .from('ns_brains')
      .select('id, owner_id, name')
      .in('owner_id', userIds)
      .eq('scope', 'user')
      .eq('is_default', true)
      .is('org_id', null)
    if (error) throw new Error(`Failed to load linked User Brains: ${error.message}`)
    return data ?? []
  }

  async listManagedPersonBrains(
    supabase: SupabaseClient,
    brainIds: string[],
  ): Promise<Array<{ id: string; name: string | null }>> {
    if (brainIds.length === 0) return []
    const { data, error } = await supabase
      .from('ns_brains')
      .select('id, name')
      .in('id', brainIds)
      .eq('scope', 'user')
    if (error) throw new Error(`Failed to load managed Person Brains: ${error.message}`)
    return data ?? []
  }

  async createManagedPersonBrain(
    supabase: SupabaseClient,
    input: { personId: string; orgId: string; ownerId: string },
  ): Promise<{ id: string; name: string }> {
    const { data, error } = await supabase.rpc('create_slack_managed_person_brain', {
      p_member_id: input.personId,
      p_org_id: input.orgId,
      p_owner_id: input.ownerId,
    })
    if (error) throw new Error(`Failed to create managed Person Brain: ${error.message}`)
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.brain_id) throw new Error('Managed Person Brain was not returned')
    return { id: String(row.brain_id), name: String(row.brain_name || 'Person Brain') }
  }
}
