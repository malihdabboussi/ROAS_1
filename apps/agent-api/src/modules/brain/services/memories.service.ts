import { createHash } from 'crypto'
import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MemoriesRepository } from '../repositories/memories.repository'
import type { MemoryListFilters } from '../repositories/memories.repository'
import type {
  CreateConnectionDto,
  CreateMemoryDto,
  SearchMemoryDto,
  UpdateMemoryDto,
} from '../types/brain.types'
import { BrainOpsHookService } from './brain-ops-hook.service'
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
    @Optional() private readonly brainOpsHook?: BrainOpsHookService,
  ) {}

  // ── List & Get ─────────────────────────────────────────────────────────

  async listMemories(
    supabase: SupabaseClient,
    userId: string,
    filters?: MemoryListFilters,
    brainId?: string,
  ) {
    const merged = brainId ? { ...filters, brain_id: brainId } : filters
    return this.memoriesRepo.findByUserId(supabase, userId, merged)
  }

  async getMemory(supabase: SupabaseClient, id: string) {
    const memory = await this.memoriesRepo.findById(supabase, id)
    if (!memory) throw new Error('Memory not found')
    return memory
  }

  // ── Create ─────────────────────────────────────────────────────────────

  async createMemory(supabase: SupabaseClient, data: CreateMemoryDto) {
    const contentHash = createHash('sha256').update(data.content.trim().toLowerCase()).digest('hex')
    const ownerId =
      data.speaker ??
      ((data.metadata as Record<string, unknown> | undefined)?.user_id as string | undefined)

    const isDuplicate = await this.memoriesRepo.checkDuplicate(supabase, contentHash, ownerId)
    if (isDuplicate) {
      throw new Error('Duplicate memory: content already exists')
    }

    const record: Record<string, unknown> = {
      content: data.content,
      content_hash: contentHash,
      memory_type: data.memory_type,
      source_type: data.source_type ?? 'manual',
      source_id: data.source_id ?? null,
      source_title: data.source_title ?? null,
      agent_id: data.agent_id ?? null,
      speaker: data.speaker ?? null,
      confidence: data.confidence ?? 0.8,
      significance: data.significance ?? 5,
      tags: data.tags ?? [],
      metadata: data.metadata ?? {},
    }
    if (data.brain_id) record.brain_id = data.brain_id
    const memory = await this.memoriesRepo.create(supabase, record)

    if (memory && this.brainOpsHook) {
      const brainId = (memory as Record<string, unknown>)?.brain_id as string | undefined
      if (brainId) {
        this.brainOpsHook
          .onMemoriesSaved(brainId, 1)
          .catch((e) => this.logger.warn(`Brain ops hook failed: ${e}`))
      }
    }

    return memory
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
    data: SearchMemoryDto & { query_embedding?: number[]; user_id?: string; brain_id?: string },
  ) {
    let queryEmbedding: number[] | undefined = data.query_embedding ?? undefined
    if (!queryEmbedding?.length) {
      if (!data.query?.trim()) {
        throw new Error('Either query or query_embedding is required')
      }
      const billing =
        data.user_id != null ? { userId: data.user_id, orgId: data.org_id } : undefined
      const generated = await this.embedding.getEmbedding(data.query, { billing })
      if (!generated) {
        throw new Error('Failed to generate embedding for search query')
      }
      queryEmbedding = generated
    }

    const results = await this.memoriesRepo.search(supabase, queryEmbedding, {
      limit: data.limit,
      threshold: data.threshold,
      memory_type: data.memory_type,
      source_type: data.source_type,
      tags: data.tags,
      min_significance: data.min_significance,
      owner_id: data.user_id,
      brain_id: data.brain_id,
    })

    return { query: data.query, results, count: results.length }
  }

  // ── Stats & Health ─────────────────────────────────────────────────────

  async getStats(supabase: SupabaseClient, userId?: string, brainId?: string) {
    return this.memoriesRepo.getStats(supabase, userId, brainId)
  }

  async getHealth(supabase: SupabaseClient, userId?: string, brainId?: string) {
    const stats = await this.memoriesRepo.getHealthStats(supabase, userId, brainId)
    return { status: 'ok', ...stats }
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
}
