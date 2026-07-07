import { createHash } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { MemoriesRepository } from '../repositories/memories.repository'
import type { MemoryListFilters } from '../repositories/memories.repository'
import type {
  CreateConnectionDto,
  CreateMemoryDto,
  SearchMemoryDto,
  UpdateMemoryDto,
} from '../types/brain.types'
import { BrainPermissionsService } from './brain-permissions.service'
import { EmbeddingService } from './embedding.service'

/**
 * Memories Service (Layer 2)
 *
 * Business logic for memory CRUD, search, connections, and versioning.
 * Receives per-request SupabaseClient from controller (RLS-enforced).
 * Calls MemoriesRepository for all data access — never touches DB directly.
 */
@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name)

  constructor(
    private readonly memoriesRepo: MemoriesRepository,
    private readonly embedding: EmbeddingService,
    private readonly brainPermissions: BrainPermissionsService,
  ) {}

  // ── List & Get ─────────────────────────────────────────────────────────

  async listMemories(
    supabase: SupabaseClient,
    userId: string,
    filters?: MemoryListFilters,
    orgId?: string | null,
  ) {
    return this.memoriesRepo.findByUserId(supabase, userId, filters, orgId)
  }

  async getMemory(supabase: SupabaseClient, id: string) {
    const memory = await this.memoriesRepo.findById(supabase, id)
    if (!memory) throw new Error('Memory not found')
    return memory
  }

  // ── Create ─────────────────────────────────────────────────────────────

  async createMemory(supabase: SupabaseClient, data: CreateMemoryDto, orgId?: string | null) {
    const contentHash = createHash('sha256').update(data.content.trim().toLowerCase()).digest('hex')
    const ownerId =
      data.speaker ??
      ((data.metadata as Record<string, unknown> | undefined)?.user_id as string | undefined)

    const isDuplicate = await this.memoriesRepo.checkDuplicate(
      supabase,
      contentHash,
      ownerId,
      orgId,
    )
    if (isDuplicate) {
      throw new Error('Duplicate memory: content already exists')
    }

    return this.memoriesRepo.create(
      supabase,
      {
        content: data.content,
        content_hash: contentHash,
        memory_type: data.memory_type,
        source_type: data.source_type ?? 'manual',
        source_id: data.source_id ?? null,
        source_title: data.source_title ?? null,
        project_id: data.project_id ?? null,
        agent_id: data.agent_id ?? null,
        speaker: data.speaker ?? null,
        confidence: data.confidence ?? 0.8,
        significance: data.significance ?? 5,
        tags: data.tags ?? [],
        metadata: data.metadata ?? {},
        media_type: data.media_type ?? 'text',
        media_url: data.media_url ?? null,
        media_mime_type: data.media_mime_type ?? null,
      },
      orgId,
    )
  }

  // ── Update ─────────────────────────────────────────────────────────────

  async updateMemory(supabase: SupabaseClient, id: string, data: UpdateMemoryDto) {
    const existing = await this.memoriesRepo.findById(supabase, id)
    if (!existing) throw new Error('Memory not found')

    // If content changed: save version + recompute hash
    if (data.content && data.content !== existing.content) {
      await this.memoriesRepo.createVersion(supabase, {
        memory_id: id,
        content_previous: existing.content,
        edited_by: data.edited_by ?? null,
      })

      const contentHash = createHash('sha256')
        .update(data.content.trim().toLowerCase())
        .digest('hex')

      const { edited_by: _editedBy, ...fields } = data
      return this.memoriesRepo.update(supabase, id, {
        ...fields,
        content_hash: contentHash,
      })
    }

    // No content change — strip edited_by (it's a version field, not a memory column)
    const { edited_by: _editedBy, ...fields } = data
    return this.memoriesRepo.update(supabase, id, fields)
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async deleteMemory(supabase: SupabaseClient, id: string) {
    const existing = await this.memoriesRepo.findById(supabase, id)
    if (!existing) throw new Error('Memory not found')

    await this.memoriesRepo.delete(supabase, id)
  }

  // ── Search ─────────────────────────────────────────────────────────────

  async searchMemories(
    supabase: SupabaseClient,
    data: SearchMemoryDto & { query_embedding?: number[]; user_id?: string },
    orgId?: string | null,
  ) {
    // Auto-generate embedding from query text if not provided (US-007)
    let queryEmbedding: number[] | undefined = data.query_embedding ?? undefined
    if (!queryEmbedding?.length) {
      if (!data.query?.trim()) {
        throw new Error('Either query or query_embedding is required')
      }
      const billing =
        data.user_id != null ? { userId: data.user_id, orgId: data.org_id ?? orgId } : undefined
      const generated = await this.embedding.getEmbedding(data.query, {
        taskType: 'RETRIEVAL_QUERY',
        billing,
      })
      if (!generated) {
        throw new Error('Failed to generate embedding for search query')
      }
      queryEmbedding = generated
    }

    const results = await this.memoriesRepo.search(
      supabase,
      queryEmbedding,
      {
        limit: data.limit,
        threshold: data.threshold,
        memory_type: data.memory_type,
        source_type: data.source_type,
        project_id: data.project_id,
        tags: data.tags,
        min_significance: data.min_significance,
        owner_id: data.user_id,
      },
      orgId,
    )

    return { query: data.query, results, count: results.length }
  }

  // ── Stats & Health ─────────────────────────────────────────────────────

  async getStats(
    supabase: SupabaseClient,
    userId: string,
    agentId?: string,
    orgId?: string | null,
  ) {
    return this.memoriesRepo.getStats(supabase, userId, agentId, orgId)
  }

  async getHealth(
    supabase: SupabaseClient,
    userId: string,
    agentId?: string,
    brainId?: string,
    orgId?: string | null,
  ) {
    const stats = await this.memoriesRepo.getHealthStats(supabase, userId, agentId, brainId, orgId)
    return { status: 'ok', ...stats }
  }

  async getHealthBatch(supabase: SupabaseClient, userId: string, brainIdsRaw?: string) {
    const brainIds = (brainIdsRaw ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
    if (brainIds.length === 0) return { brains: [] }

    const rows = await this.memoriesRepo.getHealthStatsBatch(supabase, userId, brainIds)
    return {
      brains: rows.map((row) => ({
        brain_id: row.brain_id,
        status: 'ok',
        total_memories: Number(row.total_memories ?? 0),
        total_connections: Number(row.total_connections ?? 0),
        embedding_queue: Number(row.embedding_queue ?? 0),
        last_capture: row.last_capture ?? null,
        last_recall: null,
        connections_by_type: row.connections_by_type ?? {},
        memory_counts_by_type: row.memory_counts_by_type ?? {},
        sk_entries_by_type: row.sk_entries_by_type ?? {},
        experience_sources: Number(row.experience_sources ?? 0),
      })),
    }
  }

  // ── Detail (memory + connections + connected memories + versions) ──────

  async getMemoryDetail(supabase: SupabaseClient, id: string) {
    const memory = await this.memoriesRepo.findById(supabase, id)
    if (!memory) throw new Error('Memory not found')

    const connections = await this.memoriesRepo.getConnections(supabase, id)

    // Resolve connected memory IDs
    const connectedIds = connections.map(
      (c: { source_memory_id: string; target_memory_id: string }) =>
        c.source_memory_id === id ? c.target_memory_id : c.source_memory_id,
    )
    const connectedMemories = await this.memoriesRepo.findByIds(supabase, connectedIds)

    const versions = await this.memoriesRepo.getVersions(supabase, id)

    return {
      ...memory,
      connections,
      connected_memories: connectedMemories,
      versions,
    }
  }

  // ── Connections ────────────────────────────────────────────────────────

  async createConnection(
    supabase: SupabaseClient,
    userId: string,
    sourceMemoryId: string,
    data: CreateConnectionDto,
  ) {
    // Verify source memory exists
    const source = await this.memoriesRepo.findById(supabase, sourceMemoryId)
    if (!source) throw new Error('Source memory not found')

    return this.memoriesRepo.createConnection(supabase, {
      source_memory_id: sourceMemoryId,
      target_memory_id: data.target_id,
      relationship: data.relationship,
      strength: data.strength ?? 0.5,
      created_by: userId,
    })
  }

  async deleteConnection(supabase: SupabaseClient, id: string) {
    await this.memoriesRepo.deleteConnection(supabase, id)
  }

  /** Chrome extension + clients: list ns_brains rows and campaigns for the active org context. */
  async listBrainsForExtension(supabase: SupabaseClient, userId: string, scope: RequestScope) {
    const accessibleBrains = await this.brainPermissions.listAccessibleBrains(
      supabase,
      userId,
      scope,
    )
    const accessibleIds = new Set(accessibleBrains.map((brain) => brain.id))

    const brains = await this.memoriesRepo.listExtensionBrains(supabase, scope)
    const brainsWithAccess = (brains ?? [])
      .filter((brain) => accessibleIds.has(String(brain.id)))
      .map((brain) => {
        const access = accessibleBrains.find((entry) => entry.id === brain.id)
        return { ...brain, effective_level: access?.effective_level ?? 'view' }
      })

    const campaignsRaw = await this.memoriesRepo.listExtensionCampaigns(supabase, scope)
    const campaigns = (campaignsRaw ?? []).filter((c) => {
      const kind = (c.config as Record<string, unknown> | null | undefined)?.system_kind
      return kind !== 'general'
    })

    return { brains: brainsWithAccess, campaigns }
  }
}
