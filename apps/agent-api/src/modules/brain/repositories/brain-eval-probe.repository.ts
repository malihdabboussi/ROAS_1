import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type ListResult<T> = { data: T[] | null; error: QueryError | null; count?: number | null }

@Injectable()
export class BrainEvalProbeRepository {
  async listBrainIds(
    supabase: SupabaseClient,
    input: { userId: string; orgId: string | null },
  ): Promise<ListResult<{ id: string }>> {
    let query = supabase.from('ns_brains').select('id')
    if (input.orgId) {
      query = query.or(`owner_id.eq.${input.userId},org_id.eq.${input.orgId}`)
    } else {
      query = query.eq('owner_id', input.userId)
    }
    return query
  }

  async countMemoriesContaining(
    supabase: SupabaseClient,
    input: { brainIds: string[]; pattern: string },
  ): Promise<number> {
    if (input.brainIds.length === 0) return 0
    const res = await supabase
      .from('ns_memories')
      .select('id', { count: 'exact', head: true })
      .in('brain_id', input.brainIds)
      .ilike('content', input.pattern)
    return res.count ?? 0
  }

  async countCompanyCortexContaining(
    supabase: SupabaseClient,
    input: { orgId: string | null; pattern: string },
  ): Promise<number> {
    if (!input.orgId) return 0
    const res = await supabase
      .from('company_cortex_objects')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', input.orgId)
      .or(`truth.ilike.${input.pattern},title.ilike.${input.pattern}`)
    return res.count ?? 0
  }

  async countNarrativePagesContaining(
    supabase: SupabaseClient,
    input: { brainIds: string[]; pattern: string },
  ): Promise<number> {
    if (input.brainIds.length === 0) return 0
    const res = await supabase
      .from('ns_narrative_pages')
      .select('id', { count: 'exact', head: true })
      .in('brain_id', input.brainIds)
      .or(`content_md.ilike.${input.pattern},title.ilike.${input.pattern}`)
    return res.count ?? 0
  }
}
