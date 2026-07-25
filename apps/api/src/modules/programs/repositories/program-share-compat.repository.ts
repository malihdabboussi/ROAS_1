import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpaceShareForCompat } from '../services/program-share-compat'

@Injectable()
export class ProgramShareCompatRepository {
  /** All user-targeted space shares in the org, with each space's campaign. */
  async listUserSpaceShares(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<SpaceShareForCompat[]> {
    const { data: shareRows, error: shareError } = await supabase
      .from('space_shares')
      .select('space_id, entity_id')
      .eq('org_id', orgId)
      .eq('entity_type', 'user')
    if (shareError) throw new Error(`Failed to list space shares: ${shareError.message}`)
    const shares = shareRows ?? []
    if (shares.length === 0) return []

    const spaceIds = [...new Set(shares.map((s) => String(s.space_id)))]
    const { data: spaceRows, error: spaceError } = await supabase
      .from('spaces')
      .select('id, title, campaign_id')
      .in('id', spaceIds)
    if (spaceError) throw new Error(`Failed to load shared spaces: ${spaceError.message}`)
    const spaceById = new Map(
      (spaceRows ?? []).map((row) => [
        String(row.id),
        {
          title: (row.title as string | null) ?? null,
          campaign_id: typeof row.campaign_id === 'string' ? row.campaign_id : null,
        },
      ]),
    )

    return shares.map((share) => {
      const space = spaceById.get(String(share.space_id))
      return {
        space_id: String(share.space_id),
        space_title: space?.title ?? null,
        user_id: String(share.entity_id),
        campaign_id: space?.campaign_id ?? null,
      }
    })
  }

  /** Org owners/admins bypass Program gates entirely. */
  async listAdminUserIds(supabase: SupabaseClient, orgId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('org_members')
      .select('user_id, role')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
    if (error) throw new Error(`Failed to list org admins: ${error.message}`)
    return new Set((data ?? []).map((row) => String(row.user_id)))
  }

  /** program_id -> set of user_ids with an explicit Program ACL entry. */
  async listProgramAclUserIds(
    supabase: SupabaseClient,
    programIds: string[],
  ): Promise<Map<string, Set<string>>> {
    const out = new Map<string, Set<string>>()
    if (programIds.length === 0) return out
    const { data, error } = await supabase
      .from('program_shares')
      .select('program_id, entity_id')
      .in('program_id', [...new Set(programIds)])
      .eq('entity_type', 'user')
    if (error) throw new Error(`Failed to list program ACLs: ${error.message}`)
    for (const row of data ?? []) {
      const programId = String(row.program_id)
      const set = out.get(programId) ?? new Set<string>()
      set.add(String(row.entity_id))
      out.set(programId, set)
    }
    return out
  }
}
