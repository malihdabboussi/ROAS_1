import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SnapshotsRepository } from '../repositories/snapshots.repository'
import type { SnapshotFilters } from '../repositories/snapshots.repository'
import type { CreateSnapshotDto, SnapshotType } from '../types/brain.types'

const VALID_TYPES: SnapshotType[] = ['Model', 'Rule', 'Conviction', 'Principle']

/**
 * Snapshots Service (Layer 2)
 *
 * Business logic for neural snapshots.
 * Receives per-request SupabaseClient from controller (RLS-enforced).
 * Validates input, enforces rules, delegates to repository.
 */
@Injectable()
export class SnapshotsService {
  constructor(private readonly repo: SnapshotsRepository) {}

  async listSnapshots(
    supabase: SupabaseClient,
    ownerId: string,
    filters?: SnapshotFilters,
    orgId?: string | null,
  ) {
    return this.repo.findAll(supabase, { ...filters, owner_id: ownerId }, orgId)
  }

  async getSnapshot(supabase: SupabaseClient, id: string) {
    const snapshot = await this.repo.findById(supabase, id)
    if (!snapshot) throw new NotFoundException(`Snapshot ${id} not found`)
    return snapshot
  }

  async createSnapshot(
    supabase: SupabaseClient,
    ownerId: string,
    data: CreateSnapshotDto,
    orgId?: string | null,
  ) {
    if (!VALID_TYPES.includes(data.type)) {
      throw new BadRequestException(
        `Invalid type "${data.type}". Must be one of: ${VALID_TYPES.join(', ')}`,
      )
    }

    return this.repo.create(supabase, { ...data, owner_id: ownerId }, orgId)
  }

  async updateSnapshot(supabase: SupabaseClient, id: string, data: Partial<CreateSnapshotDto>) {
    if (data.type && !VALID_TYPES.includes(data.type)) {
      throw new BadRequestException(
        `Invalid type "${data.type}". Must be one of: ${VALID_TYPES.join(', ')}`,
      )
    }

    const existing = await this.repo.findById(supabase, id)
    if (!existing) throw new NotFoundException(`Snapshot ${id} not found`)

    return this.repo.update(supabase, id, data)
  }

  async deleteSnapshot(supabase: SupabaseClient, id: string) {
    const existing = await this.repo.findById(supabase, id)
    if (!existing) throw new NotFoundException(`Snapshot ${id} not found`)

    await this.repo.delete(supabase, id)
  }

  async searchSnapshots(
    supabase: SupabaseClient,
    ownerId: string,
    queryEmbedding: number[],
    matchCount = 10,
    orgId?: string | null,
  ) {
    return this.repo.search(supabase, queryEmbedding, matchCount, ownerId, orgId)
  }

  async getStats(
    supabase: SupabaseClient,
    ownerId: string,
    agentId?: string,
    orgId?: string | null,
  ) {
    return this.repo.getStats(supabase, ownerId, agentId, orgId)
  }
}
