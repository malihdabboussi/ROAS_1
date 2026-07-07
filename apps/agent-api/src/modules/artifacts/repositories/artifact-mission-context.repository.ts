import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactMissionContextRepository {
  async findProjectForMcpContext(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('projects').select('id').eq('user_id', input.userId)
    if (input.orgId) query = query.eq('org_id', input.orgId)
    else query = query.is('org_id', null)
    return (await query.limit(1).single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
