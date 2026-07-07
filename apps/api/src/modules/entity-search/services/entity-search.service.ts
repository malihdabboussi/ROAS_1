import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EntitySearchKind, EntitySearchResult } from '../entity-search.types'
import { EntitySearchRepository } from '../repositories/entity-search.repository'

const ALL_KINDS: EntitySearchKind[] = [
  'person',
  'agent',
  'task',
  'doc',
  'channel',
  'space',
  'mission',
  'conversation',
]

function rank(q: string, result: EntitySearchResult): number {
  if (!q) return 2
  const label = result.label.toLowerCase()
  const query = q.toLowerCase()
  if (label === query) return 0
  if (label.startsWith(query)) return 1
  return 2
}

@Injectable()
export class EntitySearchService {
  constructor(private readonly entitySearchRepository: EntitySearchRepository) {}

  async search(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    kinds: EntitySearchKind[] = ALL_KINDS,
    limit = 10,
    offset = 0,
    campaignId: string | null = null,
  ): Promise<{ results: EntitySearchResult[] }> {
    const query = q.trim()
    const selected = kinds.length > 0 ? kinds : ALL_KINDS
    const tasks = selected.map((kind) =>
      this.searchKind(supabase, userId, orgId, query, kind, limit, offset, campaignId),
    )
    const groups = await Promise.all(tasks)
    if (selected.length === 1) {
      return { results: groups[0] ?? [] }
    }
    // Within each kind, sort by rank/label; cross-kind preserves the requested
    // `kinds` order (e.g. people before agents on the People tab).
    const sorted = groups.map((group) =>
      group
        .slice()
        .sort((a, b) => rank(query, a) - rank(query, b) || a.label.localeCompare(b.label)),
    )
    return { results: sorted.flat().slice(0, limit * 2) }
  }

  private searchKind(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    kind: EntitySearchKind,
    limit: number,
    offset: number,
    campaignId: string | null,
  ): Promise<EntitySearchResult[]> {
    switch (kind) {
      case 'task':
        return this.searchSpaceItems(supabase, userId, orgId, q, limit, offset, 'task')
      case 'doc':
        return this.searchSpaceItems(supabase, userId, orgId, q, limit, offset, 'doc')
      case 'space':
        return this.searchSpaces(supabase, userId, orgId, q, limit, offset)
      case 'channel':
        return this.searchChannels(supabase, userId, orgId, q, limit, offset)
      case 'mission':
        return this.searchMissions(supabase, userId, orgId, q, limit, offset)
      case 'conversation':
        return this.searchConversations(supabase, userId, orgId, q, limit, offset, campaignId)
      case 'person':
      case 'agent':
        return this.searchRoster(supabase, userId, orgId, q, limit, offset, kind)
      default: {
        const neverKind: never = kind
        throw new BadRequestException(`Unsupported entity kind: ${neverKind}`)
      }
    }
  }

  private async searchSpaceItems(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
    mode: 'task' | 'doc',
  ): Promise<EntitySearchResult[]> {
    const rows = await this.entitySearchRepository.searchSpaceItems(
      supabase,
      userId,
      orgId,
      q,
      limit,
      offset,
      mode,
    )

    // For tasks, hydrate status color/label from each space's schema.
    let statusOptionsBySpace: Map<
      string,
      Map<string, { label: string; color: string | null }>
    > = new Map()
    if (mode === 'task' && rows.length > 0) {
      const spaceIds = Array.from(new Set(rows.map((r: any) => r.space_id).filter(Boolean)))
      if (spaceIds.length > 0) {
        const spaces = await this.entitySearchRepository.listSpaceSchemas(supabase, spaceIds)
        for (const s of spaces ?? []) {
          const schema = (s as any).schema as Record<string, unknown> | null
          const fields = (schema?.fields ?? []) as Array<Record<string, unknown>>
          const statusField = fields.find((f) => f.id === 'status')
          const options = (statusField?.options ?? []) as Array<{
            id?: string
            label?: string
            color?: string
          }>
          const optMap = new Map<string, { label: string; color: string | null }>()
          for (const opt of options) {
            if (!opt.id) continue
            optMap.set(opt.id, { label: opt.label ?? opt.id, color: opt.color ?? null })
          }
          statusOptionsBySpace.set((s as any).id as string, optMap)
        }
      }
    }

    return rows.map((row: any) => {
      const baseResult: EntitySearchResult = {
        kind: mode,
        id: row.id,
        label: row.title ?? 'Untitled',
        subtitle: mode === 'doc' ? 'Doc' : 'Task',
        iconUrl: null,
        url: `/spaces/${row.space_id}/${row.id}`,
        status: mode === 'task' ? (row.status ?? null) : null,
      }
      if (mode === 'task' && row.status && row.space_id) {
        const opt = statusOptionsBySpace.get(row.space_id)?.get(row.status)
        if (opt) {
          baseResult.statusColor = opt.color
          baseResult.statusLabel = opt.label
        }
      }
      return baseResult
    })
  }

  private async searchSpaces(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
  ): Promise<EntitySearchResult[]> {
    const rows = await this.entitySearchRepository.searchSpaces(
      supabase,
      userId,
      orgId,
      q,
      limit,
      offset,
    )
    return rows.map((row: any) => ({
      kind: 'space',
      id: row.id,
      label: row.title ?? 'Untitled space',
      subtitle: row.description ?? 'Space',
      iconUrl: null,
      url: `/spaces/${row.id}`,
    }))
  }

  private async searchChannels(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
  ): Promise<EntitySearchResult[]> {
    const rows = await this.entitySearchRepository.searchChannels(supabase, orgId, q, limit, offset)
    return rows.map((row: any) => ({
      kind: 'channel',
      id: row.id,
      label: row.name ?? 'Channel',
      subtitle: row.description ?? 'Channel',
      iconUrl: null,
      url: `/channels/${row.id}`,
    }))
  }

  private async searchMissions(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
  ): Promise<EntitySearchResult[]> {
    const rows = await this.entitySearchRepository.searchMissions(
      supabase,
      userId,
      orgId,
      q,
      limit,
      offset,
    )
    return rows.map((row: any) => ({
      kind: 'mission',
      id: row.id,
      label: row.title ?? 'Mission',
      subtitle: row.status ?? 'Mission',
      iconUrl: null,
      url: `/missions/${row.id}`,
    }))
  }

  private async searchConversations(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
    campaignId: string | null,
  ): Promise<EntitySearchResult[]> {
    const rows = await this.entitySearchRepository.searchConversations(
      supabase,
      userId,
      orgId,
      q,
      limit,
      offset,
      campaignId,
    )
    return rows.map((row: any) => {
      const agent = row.agent_id ? String(row.agent_id) : 'vibey'
      const updated = row.updated_at ? new Date(String(row.updated_at)).toLocaleDateString() : null
      return {
        kind: 'conversation' as const,
        id: row.id,
        label: row.title?.trim() || 'Untitled conversation',
        subtitle: updated ? `${agent} · ${updated}` : agent,
        iconUrl: null,
        url: null,
      }
    })
  }

  private async searchRoster(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    q: string,
    limit: number,
    offset: number,
    kind: 'person' | 'agent',
  ): Promise<EntitySearchResult[]> {
    if (orgId) {
      const rosterKind = kind === 'person' ? 'human' : 'agent'
      const rows = await this.entitySearchRepository.searchOrgRoster(
        supabase,
        orgId,
        q,
        limit,
        offset,
        rosterKind,
      )
      return rows.map((row: any) => ({
        kind,
        id: row.user_id ?? row.agent_key ?? row.participant_id,
        label: row.display_name ?? row.agent_key ?? 'Member',
        subtitle: row.role_label ?? (kind === 'person' ? 'Person' : 'Agent'),
        iconUrl: row.avatar_url ?? null,
        url: null,
      }))
    }

    if (kind === 'person') {
      const rows = await this.entitySearchRepository.findPersonalProfile(supabase, userId, offset)
      return rows
        .filter(
          (row: any) =>
            !q ||
            `${row.full_name ?? ''} ${row.email ?? ''}`.toLowerCase().includes(q.toLowerCase()),
        )
        .map((row: any) => ({
          kind: 'person',
          id: row.id,
          label: row.full_name ?? row.email ?? 'Me',
          subtitle: row.email ?? 'Person',
          iconUrl: row.avatar_url ?? null,
          url: null,
        }))
    }

    const rows = await this.entitySearchRepository.searchPersonalAgents(
      supabase,
      userId,
      q,
      limit,
      offset,
    )
    return rows.map((row: any) => ({
      kind: 'agent',
      id: row.agent_key,
      label: row.name ?? row.agent_key,
      subtitle: row.role ?? 'Agent',
      iconUrl: row.image_url ?? null,
      url: null,
    }))
  }
}
