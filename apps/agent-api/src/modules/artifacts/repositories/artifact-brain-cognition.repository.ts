import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string; code?: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null }
type CognitionContext = {
  brainId: string
  subjectId: string
  includeLegacySubjectFallback: boolean
}

const BELIEF_PATTERN_SUMMARY_COLUMNS =
  'id, brain_id, subject_id, pattern_name, description, strength, status, last_reinforced_at, created_at, updated_at'
const PERSPECTIVE_SUMMARY_COLUMNS =
  'id, brain_id, subject_id, name, description, beliefs, influence_areas, strength, status, created_at, updated_at'

@Injectable()
export class ArtifactBrainCognitionRepository {
  private scopeQuery(query: any, context: CognitionContext) {
    if (!context.includeLegacySubjectFallback) return query.eq('brain_id', context.brainId)
    return query.or(
      `brain_id.eq.${context.brainId},and(brain_id.is.null,subject_id.eq.${context.subjectId})`,
    )
  }

  async listBeliefPatterns(
    serviceClient: SupabaseClient,
    input: {
      context: CognitionContext
      status?: string | null
      limit: number
      offset?: number
      includeDetails?: boolean
    },
  ): Promise<QueryListResult<Record<string, any>>> {
    const columns = input.includeDetails ? '*' : BELIEF_PATTERN_SUMMARY_COLUMNS
    let query = this.scopeQuery(
      serviceClient.from('ns_belief_patterns').select(columns),
      input.context,
    ).order('strength', { ascending: false })
    if (
      input.status &&
      ['emerging', 'active', 'challenged', 'transforming', 'resolved'].includes(input.status)
    ) {
      query = query.eq('status', input.status)
    } else {
      query = query.in('status', ['emerging', 'active', 'challenged'])
    }
    const offset = Math.max(0, input.offset ?? 0)
    return (await query.range(offset, offset + input.limit - 1)) as QueryListResult<
      Record<string, any>
    >
  }

  async createBeliefPattern(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, any> | null; error: QueryError | null }> {
    return (await serviceClient.from('ns_belief_patterns').insert(payload).select().single()) as {
      data: Record<string, any> | null
      error: QueryError | null
    }
  }

  async findBeliefPattern(
    serviceClient: SupabaseClient,
    input: { context: CognitionContext; id: string; columns: string },
  ): Promise<QueryResult<Record<string, any>>> {
    return (await this.scopeQuery(
      serviceClient.from('ns_belief_patterns').select(input.columns).eq('id', input.id),
      input.context,
    ).maybeSingle()) as QueryResult<Record<string, any>>
  }

  async updateBeliefPattern(
    serviceClient: SupabaseClient,
    input: { id: string; payload: Record<string, unknown>; select?: boolean },
  ): Promise<{ data: Record<string, any> | null; error: QueryError | null }> {
    const query = serviceClient.from('ns_belief_patterns').update(input.payload).eq('id', input.id)
    return input.select
      ? ((await query.select().single()) as {
          data: Record<string, any> | null
          error: QueryError | null
        })
      : ((await query) as { data: Record<string, any> | null; error: QueryError | null })
  }

  async findMemory(
    serviceClient: SupabaseClient,
    memoryId: string,
  ): Promise<QueryResult<{ id: string; brain_id: string }>> {
    return (await serviceClient
      .from('ns_memories')
      .select('id, brain_id')
      .eq('id', memoryId)
      .maybeSingle()) as QueryResult<{ id: string; brain_id: string }>
  }

  async listPerspectives(
    serviceClient: SupabaseClient,
    input: {
      context: CognitionContext
      status?: string | null
      limit: number
      offset?: number
      includeDetails?: boolean
    },
  ): Promise<QueryListResult<Record<string, any>>> {
    const columns = input.includeDetails ? '*' : PERSPECTIVE_SUMMARY_COLUMNS
    let query = this.scopeQuery(
      serviceClient.from('ns_perspectives').select(columns),
      input.context,
    ).order('strength', { ascending: false })
    query = input.status
      ? query.eq('status', input.status)
      : query.in('status', ['emerging', 'active'])
    const offset = Math.max(0, input.offset ?? 0)
    return (await query.range(offset, offset + input.limit - 1)) as QueryListResult<
      Record<string, any>
    >
  }

  async createPerspective(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, any> | null; error: QueryError | null }> {
    return (await serviceClient.from('ns_perspectives').insert(payload).select().single()) as {
      data: Record<string, any> | null
      error: QueryError | null
    }
  }

  async findPerspective(
    serviceClient: SupabaseClient,
    input: { context: CognitionContext; id: string; columns: string },
  ): Promise<QueryResult<Record<string, any>>> {
    return (await this.scopeQuery(
      serviceClient.from('ns_perspectives').select(input.columns).eq('id', input.id),
      input.context,
    ).maybeSingle()) as QueryResult<Record<string, any>>
  }

  async updatePerspective(
    serviceClient: SupabaseClient,
    input: { id: string; payload: Record<string, unknown>; select?: boolean },
  ): Promise<{ data: Record<string, any> | null; error: QueryError | null }> {
    const query = serviceClient.from('ns_perspectives').update(input.payload).eq('id', input.id)
    return input.select
      ? ((await query.select().single()) as {
          data: Record<string, any> | null
          error: QueryError | null
        })
      : ((await query) as { data: Record<string, any> | null; error: QueryError | null })
  }
}
