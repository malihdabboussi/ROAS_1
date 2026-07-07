import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string; code?: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null }

const NARRATIVE_PAGE_DETAIL_COLUMNS =
  'id, brain_id, slug, title, page_type, content_md, summary, source_refs, tags, status, version, last_synthesis_at, created_at, updated_at'
const NARRATIVE_PAGE_SUMMARY_COLUMNS =
  'id, brain_id, slug, title, page_type, summary, source_refs, tags, status, version, last_synthesis_at, created_at, updated_at'

@Injectable()
export class ArtifactBrainNarrativeRepository {
  async listNarrativePages(
    serviceClient: SupabaseClient,
    input: {
      brainId: string
      slug?: string | null
      pageType?: string | null
      status: string
      limit?: number
      offset?: number
      includeContent?: boolean
    },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    const columns =
      input.includeContent || input.slug
        ? NARRATIVE_PAGE_DETAIL_COLUMNS
        : NARRATIVE_PAGE_SUMMARY_COLUMNS
    let query = serviceClient
      .from('ns_narrative_pages')
      .select(columns)
      .eq('brain_id', input.brainId)
    if (input.slug) query = query.eq('slug', input.slug)
    else {
      if (input.pageType) query = query.eq('page_type', input.pageType)
      query = query.eq('status', input.status)
    }
    query = query.order('updated_at', { ascending: false })
    if (typeof input.limit === 'number') {
      const offset = Math.max(0, input.offset ?? 0)
      query = query.range(offset, offset + input.limit - 1)
    }
    return (await query) as QueryListResult<Record<string, unknown>>
  }

  async listTimelines(
    serviceClient: SupabaseClient,
    input: {
      brainId: string
      timelineType?: string | null
      targetType?: string | null
      targetId?: string | null
      status: string
      limit: number
    },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    let query = serviceClient
      .from('brain_timelines')
      .select('*')
      .eq('brain_id', input.brainId)
      .order('evidence_started_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
    if (input.timelineType) query = query.eq('timeline_type', input.timelineType)
    if (input.targetType) query = query.eq('target_type', input.targetType)
    if (input.targetId) query = query.eq('target_id', input.targetId)
    if (input.status) query = query.eq('status', input.status)
    return (await query.limit(input.limit)) as QueryListResult<Record<string, unknown>>
  }

  async findTimeline(
    serviceClient: SupabaseClient,
    timelineId: string,
  ): Promise<QueryResult<{ id: string; brain_id: string }>> {
    return (await serviceClient
      .from('brain_timelines')
      .select('id, brain_id')
      .eq('id', timelineId)
      .maybeSingle()) as QueryResult<{ id: string; brain_id: string }>
  }

  async listTimelineItems(
    serviceClient: SupabaseClient,
    input: { brainId: string; timelineId: string; limit: number },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    return (await serviceClient
      .from('brain_timeline_items')
      .select('*')
      .eq('brain_id', input.brainId)
      .eq('timeline_id', input.timelineId)
      .order('occurred_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(input.limit)) as QueryListResult<Record<string, unknown>>
  }

  async createTimeline(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await serviceClient.from('brain_timelines').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findTimelineItemByDedupeKey(
    serviceClient: SupabaseClient,
    input: { timelineId: string; dedupeKey: string },
  ): Promise<QueryResult<{ id: string }>> {
    return (await serviceClient
      .from('brain_timeline_items')
      .select('id')
      .eq('timeline_id', input.timelineId)
      .eq('dedupe_key', input.dedupeKey)
      .maybeSingle()) as QueryResult<{ id: string }>
  }

  async writeTimelineItem(
    serviceClient: SupabaseClient,
    input: { id?: string; payload: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    const query = input.id
      ? serviceClient
          .from('brain_timeline_items')
          .update({ ...input.payload, updated_at: new Date().toISOString() })
          .eq('id', input.id)
      : serviceClient.from('brain_timeline_items').insert(input.payload)
    return (await query.select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async archiveTimeline(
    serviceClient: SupabaseClient,
    timelineId: string,
  ): Promise<{ error: QueryError | null }> {
    return (await serviceClient
      .from('brain_timelines')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', timelineId)) as { error: QueryError | null }
  }

  async createPage(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await serviceClient.from('ns_narrative_pages').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findPage(
    serviceClient: SupabaseClient,
    input: { pageId: string; columns: string },
  ): Promise<QueryResult<Record<string, any>>> {
    return (await serviceClient
      .from('ns_narrative_pages')
      .select(input.columns)
      .eq('id', input.pageId)
      .single()) as QueryResult<Record<string, any>>
  }

  async updatePage(
    serviceClient: SupabaseClient,
    input: { pageId: string; payload: Record<string, unknown>; select?: boolean },
  ): Promise<{ data: Record<string, any> | null; error: QueryError | null }> {
    const query = serviceClient
      .from('ns_narrative_pages')
      .update(input.payload)
      .eq('id', input.pageId)
    return input.select
      ? ((await query.select().single()) as {
          data: Record<string, any> | null
          error: QueryError | null
        })
      : ((await query) as { data: Record<string, any> | null; error: QueryError | null })
  }

  async listPagesByIds(
    serviceClient: SupabaseClient,
    pageIds: string[],
  ): Promise<QueryListResult<{ id: string; brain_id: string }>> {
    return (await serviceClient
      .from('ns_narrative_pages')
      .select('id, brain_id')
      .in('id', pageIds)) as QueryListResult<{ id: string; brain_id: string }>
  }

  async upsertPageLink(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await serviceClient
      .from('ns_narrative_links')
      .upsert(payload, { onConflict: 'from_page_id,to_page_id' })
      .select()
      .single()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async deletePageLink(
    serviceClient: SupabaseClient,
    input: { fromId: string; toId: string },
  ): Promise<{ error: QueryError | null }> {
    return (await serviceClient
      .from('ns_narrative_links')
      .delete()
      .eq('from_page_id', input.fromId)
      .eq('to_page_id', input.toId)) as { error: QueryError | null }
  }

  async listBrainLog(
    serviceClient: SupabaseClient,
    input: { brainId: string; eventType?: string | null; limit: number },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    let query = serviceClient
      .from('ns_brain_log')
      .select('id, event_type, summary, affected_pages, source_ref, metadata, created_at')
      .eq('brain_id', input.brainId)
      .order('created_at', { ascending: false })
    if (input.eventType) query = query.eq('event_type', input.eventType)
    return (await query.limit(input.limit)) as QueryListResult<Record<string, unknown>>
  }

  async logBrainEvent(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await serviceClient.from('ns_brain_log').insert(payload).select().single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listLintResults(
    serviceClient: SupabaseClient,
    input: {
      brainId: string
      checkType?: string | null
      severity?: string | null
      showResolved: boolean
      limit: number
    },
  ): Promise<QueryListResult<Record<string, unknown>>> {
    let query = serviceClient
      .from('ns_brain_lint_results')
      .select(
        'id, check_type, severity, title, description, affected_refs, resolved, resolved_at, created_at',
      )
      .eq('brain_id', input.brainId)
      .order('created_at', { ascending: false })
    if (input.checkType) query = query.eq('check_type', input.checkType)
    if (input.severity) query = query.eq('severity', input.severity)
    if (!input.showResolved) query = query.eq('resolved', false)
    return (await query.limit(input.limit)) as QueryListResult<Record<string, unknown>>
  }

  async findBrainForLint(
    serviceClient: SupabaseClient,
    brainId: string,
  ): Promise<QueryResult<Record<string, any>>> {
    return (await serviceClient
      .from('ns_brains')
      .select('owner_id, org_id, cortex_max')
      .eq('id', brainId)
      .single()) as QueryResult<Record<string, any>>
  }

  async enqueueBrainLint(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ error: QueryError | null }> {
    return (await serviceClient.from('brain_ops_outbox').insert(payload)) as {
      error: QueryError | null
    }
  }

  async findLintResult(
    serviceClient: SupabaseClient,
    id: string,
  ): Promise<QueryResult<{ id: string; brain_id: string }>> {
    return (await serviceClient
      .from('ns_brain_lint_results')
      .select('id, brain_id')
      .eq('id', id)
      .maybeSingle()) as QueryResult<{ id: string; brain_id: string }>
  }

  async resolveLintResult(
    serviceClient: SupabaseClient,
    id: string,
  ): Promise<{ error: QueryError | null }> {
    return (await serviceClient
      .from('ns_brain_lint_results')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)) as { error: QueryError | null }
  }
}
