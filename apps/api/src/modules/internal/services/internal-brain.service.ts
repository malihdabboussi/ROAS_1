import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainNodeTransferService } from '../../brain/services/brain-node-transfer.service'
import { MemoriesService } from '../../brain/services/memories.service'
import { SkService } from '../../brain/services/sk.service'
import { SnapshotsService } from '../../brain/services/snapshots.service'
import type {
  AssignMemorySourceDto,
  BrainNodeTransferBySourceDto,
  BrainNodeTransferDto,
} from '../../brain/types/brain.types'
import { InternalRepository } from '../repositories/internal.repository'

export type InternalBrainDeleteNodeType =
  | 'memory'
  | 'snapshot'
  | 'sk_entry'
  | 'sk_source'
  | 'connection'

@Injectable()
export class InternalBrainService {
  constructor(
    private readonly transferService: BrainNodeTransferService,
    private readonly memoriesService: MemoriesService,
    private readonly snapshotsService: SnapshotsService,
    private readonly skService: SkService,
    private readonly repository: InternalRepository,
  ) {}

  async transferNode(userId: string, dto: BrainNodeTransferDto) {
    const supabase = this.repository.createServiceClient()
    return this.transferService.transfer(supabase, userId, dto)
  }

  async transferBySource(userId: string, dto: BrainNodeTransferBySourceDto) {
    const supabase = this.repository.createServiceClient()
    return this.transferService.transferBySource(supabase, userId, dto)
  }

  async assignMemorySource(userId: string, dto: AssignMemorySourceDto) {
    const newTitle = dto.new_source_title?.trim()
    if (!newTitle) throw new BadRequestException('new_source_title is required')

    const hasIds = Array.isArray(dto.memory_ids) && dto.memory_ids.length > 0
    const matchTitle = dto.match_source_title?.trim()
    const orphan = dto.match_orphan_source_title === true
    if (!hasIds && !matchTitle && !orphan) {
      throw new BadRequestException(
        'Provide memory_ids, match_source_title, or match_orphan_source_title',
      )
    }

    const supabase = this.repository.createServiceClient()
    const { data: brain, error: bErr } = await this.repository.getDefaultUserBrain(supabase, userId)
    if (bErr) throw new BadRequestException(`Brain lookup failed: ${bErr.message}`)
    if (!brain?.id) throw new BadRequestException('Default brain not found')

    const brainId = String(brain.id)
    const patch = {
      source_title: newTitle,
      source_id:
        dto.new_source_id != null && String(dto.new_source_id).trim()
          ? String(dto.new_source_id).trim()
          : null,
    }

    if (hasIds) {
      const ids = dto.memory_ids!.map((x) => String(x).trim()).filter(Boolean)
      for (const id of ids) {
        await this.assertMemoryOwned(supabase, userId, id)
      }
      const { data, error } = await this.repository.updateMemoriesByIds(
        supabase,
        brainId,
        ids,
        patch,
      )
      if (error) throw new BadRequestException(`Update failed: ${error.message}`)
      return { success: true, updated_count: (data ?? []).length }
    }

    if (matchTitle) {
      const { data, error } = await this.repository.updateMemoriesBySourceTitle(
        supabase,
        brainId,
        matchTitle,
        patch,
      )
      if (error) throw new BadRequestException(`Update failed: ${error.message}`)
      return { success: true, updated_count: (data ?? []).length }
    }

    const [nullRows, emptyRows] = await Promise.all([
      this.repository.listMemoriesWithNullSourceTitle(supabase, brainId),
      this.repository.listMemoriesWithEmptySourceTitle(supabase, brainId),
    ])
    if (nullRows.error) throw new BadRequestException(`Lookup failed: ${nullRows.error.message}`)
    if (emptyRows.error) throw new BadRequestException(`Lookup failed: ${emptyRows.error.message}`)
    const orphanIds = [
      ...new Set([
        ...(nullRows.data ?? []).map((r: { id: string }) => r.id),
        ...(emptyRows.data ?? []).map((r: { id: string }) => r.id),
      ]),
    ]
    if (orphanIds.length === 0) {
      return { success: true, updated_count: 0 }
    }
    const { data, error } = await this.repository.updateMemoriesByIds(
      supabase,
      brainId,
      orphanIds,
      patch,
    )
    if (error) throw new BadRequestException(`Update failed: ${error.message}`)
    return { success: true, updated_count: (data ?? []).length }
  }

  async deleteBrainNode(userId: string, nodeType: InternalBrainDeleteNodeType, nodeId: string) {
    const id = nodeId?.trim()
    if (!id) throw new BadRequestException('node_id is required')
    const supabase = this.repository.createServiceClient()

    switch (nodeType) {
      case 'memory': {
        await this.assertMemoryOwned(supabase, userId, id)
        await this.memoriesService.deleteMemory(supabase, id)
        return { success: true }
      }
      case 'snapshot': {
        await this.assertSnapshotOwned(supabase, userId, id)
        await this.snapshotsService.deleteSnapshot(supabase, id)
        return { success: true }
      }
      case 'sk_entry': {
        await this.assertSkEntryOwned(supabase, userId, id)
        await this.skService.deleteEntry(supabase, userId, id)
        return { success: true }
      }
      case 'sk_source': {
        await this.assertSkSourceOwned(supabase, userId, id)
        await this.skService.deleteSource(supabase, userId, id)
        return { success: true }
      }
      case 'connection': {
        await this.assertConnectionOwned(supabase, userId, id)
        await this.memoriesService.deleteConnection(supabase, id)
        return { success: true }
      }
      default:
        throw new BadRequestException(`Unsupported node_type: ${nodeType}`)
    }
  }

  private async assertBrainOwnedByUser(
    supabase: SupabaseClient,
    userId: string,
    brainId: string,
  ): Promise<void> {
    const { data, error } = await this.repository.getBrainOwnedByUser(supabase, userId, brainId)
    if (error) throw new BadRequestException(`Brain lookup failed: ${error.message}`)
    if (!data) throw new ForbiddenException('Brain node not found or not owned by user')
  }

  private async assertMemoryOwned(
    supabase: SupabaseClient,
    userId: string,
    memoryId: string,
  ): Promise<void> {
    const { data: mem, error } = await this.repository.getMemoryBrainId(supabase, memoryId)
    if (error) throw new BadRequestException(`Memory lookup failed: ${error.message}`)
    if (!mem?.brain_id) throw new NotFoundException('Memory not found')
    await this.assertBrainOwnedByUser(supabase, userId, String(mem.brain_id))
  }

  private async assertSnapshotOwned(
    supabase: SupabaseClient,
    userId: string,
    snapshotId: string,
  ): Promise<void> {
    const { data: row, error } = await this.repository.getSnapshotBrainId(supabase, snapshotId)
    if (error) throw new BadRequestException(`Snapshot lookup failed: ${error.message}`)
    if (!row?.brain_id) throw new NotFoundException('Snapshot not found')
    await this.assertBrainOwnedByUser(supabase, userId, String(row.brain_id))
  }

  private async assertSkEntryOwned(
    supabase: SupabaseClient,
    userId: string,
    entryId: string,
  ): Promise<void> {
    const { data: row, error } = await this.repository.getSkEntryBrainId(supabase, entryId)
    if (error) throw new BadRequestException(`SK entry lookup failed: ${error.message}`)
    if (!row?.brain_id) throw new NotFoundException('SK entry not found')
    await this.assertBrainOwnedByUser(supabase, userId, String(row.brain_id))
  }

  private async assertSkSourceOwned(
    supabase: SupabaseClient,
    userId: string,
    sourceId: string,
  ): Promise<void> {
    const { data: row, error } = await this.repository.getSkSourceBrainId(supabase, sourceId)
    if (error) throw new BadRequestException(`SK source lookup failed: ${error.message}`)
    if (!row?.brain_id) throw new NotFoundException('SK source not found')
    await this.assertBrainOwnedByUser(supabase, userId, String(row.brain_id))
  }

  private async assertConnectionOwned(
    supabase: SupabaseClient,
    userId: string,
    connectionId: string,
  ): Promise<void> {
    const { data: conn, error } = await this.repository.getConnectionMemoryIds(
      supabase,
      connectionId,
    )
    if (error) throw new BadRequestException(`Connection lookup failed: ${error.message}`)
    if (!conn?.source_memory_id || !conn?.target_memory_id) {
      throw new NotFoundException('Connection not found')
    }
    await this.assertMemoryOwned(supabase, userId, String(conn.source_memory_id))
    await this.assertMemoryOwned(supabase, userId, String(conn.target_memory_id))
  }
}
