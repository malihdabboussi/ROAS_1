import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

type BrainAccessRow = {
  id: string
  owner_id: string | null
  org_id: string | null
  scope: string | null
}

type BrainCortexRow = {
  id: string
  owner_id: string | null
  org_id: string | null
  cortex_max: boolean | null
  last_library_sync_at: string | null
}

@Injectable()
export class BrainCortexMaxRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async findBrainForImage(brainId: string): Promise<BrainAccessRow | null> {
    const { data } = await this.serviceClient.client
      .from('ns_brains')
      .select('id, owner_id, org_id, scope')
      .eq('id', brainId)
      .maybeSingle()
    return (data ?? null) as BrainAccessRow | null
  }

  async updateBrainImage(brainId: string, imageUrl: string | null): Promise<void> {
    const { error } = await this.serviceClient.client
      .from('ns_brains')
      .update({ image_url: imageUrl })
      .eq('id', brainId)
    if (error) throw error
  }

  async findBrainForCortexToggle(brainId: string): Promise<BrainCortexRow | null> {
    const { data } = await this.serviceClient.client
      .from('ns_brains')
      .select('id, owner_id, org_id, cortex_max, last_library_sync_at')
      .eq('id', brainId)
      .maybeSingle()
    return (data ?? null) as BrainCortexRow | null
  }

  async updateCortexMax(brainId: string, enabled: boolean): Promise<void> {
    const { error } = await this.serviceClient.client
      .from('ns_brains')
      .update({ cortex_max: enabled })
      .eq('id', brainId)
    if (error) throw error
  }

  async countBrainMemories(brainId: string): Promise<number> {
    const { count } = await this.serviceClient.client
      .from('ns_memories')
      .select('id', { count: 'exact', head: true })
      .eq('brain_id', brainId)
    return count ?? 0
  }

  async enqueueInitialLibrarySync(input: {
    brainId: string
    userId: string | null
    orgId: string | null
  }): Promise<boolean> {
    const { error } = await this.serviceClient.client.from('brain_ops_outbox').insert({
      brain_id: input.brainId,
      user_id: input.userId,
      org_id: input.orgId,
      event_type: 'brain_library_sync',
      dedupe_key: `brain-library-sync-initial-${input.brainId}-${Date.now()}`,
      payload: {
        brain_label: 'user brain',
        entry_type: 'memory',
        entry_count: 0,
        is_default: true,
        formatted_entries: '',
      },
    })
    return !error
  }

  async findBrainForNarrativePages(
    brainId: string,
  ): Promise<Pick<BrainCortexRow, 'id' | 'owner_id' | 'cortex_max'> | null> {
    const { data } = await this.serviceClient.client
      .from('ns_brains')
      .select('id, owner_id, cortex_max')
      .eq('id', brainId)
      .maybeSingle()
    return (data ?? null) as Pick<BrainCortexRow, 'id' | 'owner_id' | 'cortex_max'> | null
  }

  async listActiveNarrativePages(brainId: string): Promise<Record<string, unknown>[]> {
    const { data } = await this.serviceClient.client
      .from('ns_narrative_pages')
      .select(
        'id, slug, title, page_type, summary, content_md, source_refs, tags, status, version, updated_at',
      )
      .eq('brain_id', brainId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
    return (data ?? []) as Record<string, unknown>[]
  }

  async listActiveTimelines(brainId: string): Promise<Record<string, unknown>[]> {
    const { data: timelines, error } = await this.serviceClient.client
      .from('brain_timelines')
      .select('*')
      .eq('brain_id', brainId)
      .eq('status', 'active')
      .order('evidence_started_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
    if (error) throw new Error(`Failed to load brain timelines: ${error.message}`)

    const rows = (timelines ?? []) as Record<string, unknown>[]
    const ids = rows.map((row) => String(row.id ?? '')).filter(Boolean)
    if (ids.length === 0) return rows

    const { data: items, error: itemsError } = await this.serviceClient.client
      .from('brain_timeline_items')
      .select('*')
      .eq('brain_id', brainId)
      .in('timeline_id', ids)
      .order('occurred_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(200)
    if (itemsError) throw new Error(`Failed to load timeline item previews: ${itemsError.message}`)

    const itemsByTimeline = new Map<string, Record<string, unknown>[]>()
    for (const item of (items ?? []) as Record<string, unknown>[]) {
      const timelineId = String(item.timeline_id ?? '')
      if (!timelineId) continue
      itemsByTimeline.set(timelineId, [...(itemsByTimeline.get(timelineId) ?? []), item])
    }
    return rows.map((timeline) => ({
      ...timeline,
      items: itemsByTimeline.get(String(timeline.id ?? '')) ?? [],
    }))
  }

  async listTimelineItems(brainId: string, timelineId: string): Promise<Record<string, unknown>[]> {
    const { data: timeline, error: timelineError } = await this.serviceClient.client
      .from('brain_timelines')
      .select('id, brain_id')
      .eq('id', timelineId)
      .eq('brain_id', brainId)
      .maybeSingle()
    if (timelineError) throw new Error(`Failed to load timeline: ${timelineError.message}`)
    if (!timeline) return []

    const { data, error } = await this.serviceClient.client
      .from('brain_timeline_items')
      .select('*')
      .eq('brain_id', brainId)
      .eq('timeline_id', timelineId)
      .order('occurred_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to load timeline items: ${error.message}`)
    return (data ?? []) as Record<string, unknown>[]
  }
}
