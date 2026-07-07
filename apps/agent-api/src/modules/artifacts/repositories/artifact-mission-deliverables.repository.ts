import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactMissionDeliverablesRepository {
  async findLatestVideoDeliverableByMediaJob(
    supabase: SupabaseClient,
    input: { missionId: string; mediaJobId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('mission_deliverables')
      .select('id')
      .eq('mission_id', input.missionId)
      .eq('type', 'video')
      .contains('metadata', { media_job_id: input.mediaJobId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
