import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class ArtifactMcpRepository {
  async findFirstProjectId(supabase: SupabaseClient): Promise<string | null> {
    const { data } = await supabase
      .from('project_repos')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return data?.id ?? null
  }
}
