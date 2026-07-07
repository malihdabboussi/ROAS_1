import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BrainNodeTransferBySourceDto,
  BrainNodeTransferDto,
  BrainNodeTransferScope,
} from '../types/brain.types'
import { BrainNodeTransferRepository } from '../repositories/brain-node-transfer.repository'
import { BrainNodeTransferCopyService } from './brain-node-transfer-copy.service'
import type {
  BrainNodeTransferExtractedRecords,
  BrainNodeTransferScopeResolution,
} from './brain-node-transfer.types'

@Injectable()
export class BrainNodeTransferService {
  constructor(
    private readonly transferRepository: BrainNodeTransferRepository,
    private readonly copyService: BrainNodeTransferCopyService,
  ) {}

  async transfer(
    supabase: SupabaseClient,
    userId: string,
    dto: BrainNodeTransferDto,
  ): Promise<{ success: boolean; copied: number; moved: number }> {
    if (!dto.node_id?.trim()) throw new Error('node_id is required')
    if (!dto.operation || !['copy', 'move'].includes(dto.operation)) {
      throw new Error('operation must be copy or move')
    }
    const sourceScope = await this.resolveScope(supabase, userId, dto.source_scope)
    const targetScope = await this.resolveScope(supabase, userId, dto.target_scope)
    if (this.scopeKey(sourceScope) === this.scopeKey(targetScope)) {
      throw new Error('source and target brains must be different')
    }

    const extracted = await this.extractRecords(supabase, dto, sourceScope)
    const copied = await this.copyService.copyRecords(supabase, userId, extracted, targetScope)

    if (dto.operation === 'move') {
      await this.deleteSourceRecords(supabase, sourceScope, extracted)
    }

    return { success: true, copied, moved: dto.operation === 'move' ? copied : 0 }
  }

  async transferBySource(
    supabase: SupabaseClient,
    userId: string,
    dto: BrainNodeTransferBySourceDto,
  ): Promise<{ success: boolean; matched: number; copied: number; moved: number }> {
    const title = dto.source_title?.trim()
    if (!title) throw new Error('source_title is required')
    if (!dto.operation || !['copy', 'move'].includes(dto.operation)) {
      throw new Error('operation must be copy or move')
    }
    const sourceScope = await this.resolveScope(supabase, userId, dto.source_scope)
    const targetScope = await this.resolveScope(supabase, userId, dto.target_scope)
    if (this.scopeKey(sourceScope) === this.scopeKey(targetScope)) {
      throw new Error('source and target brains must be different')
    }

    const memories: Array<Record<string, unknown>> = []
    const snapshots: Array<Record<string, unknown>> = []
    const campaignNodes: Array<Record<string, unknown>> = []

    if (sourceScope.type === 'campaign') {
      const st = dto.source_type?.trim()
      const nodes = await this.transferRepository.findCampaignNodesByTitle(
        supabase,
        sourceScope.campaignId,
        title,
        st || undefined,
      )
      campaignNodes.push(...nodes)
    } else {
      const memSt = dto.source_type?.trim()
      const sid = dto.source_id != null ? String(dto.source_id).trim() : ''
      const mems = await this.transferRepository.findMemoriesBySource(
        supabase,
        sourceScope.brainId,
        title,
        memSt || undefined,
        sid || undefined,
      )
      memories.push(...mems)

      const snapSt = dto.source_type?.trim()
      const snapSid = dto.source_id != null ? String(dto.source_id).trim() : ''
      if (snapSt && snapSid) {
        const snaps = await this.transferRepository.findSnapshotsBySource(
          supabase,
          sourceScope.brainId,
          snapSt,
          snapSid,
        )
        snapshots.push(...snaps)
      }
    }

    const matched = memories.length + snapshots.length + campaignNodes.length
    if (matched === 0) throw new Error('No nodes found for source_title')

    const extracted = {
      memories,
      snapshots,
      skSources: [] as Array<Record<string, unknown>>,
      skEntries: [] as Array<Record<string, unknown>>,
      campaignNodes,
      sourceSkSourceId: null as string | null,
    }

    const copied = await this.copyService.copyRecords(supabase, userId, extracted, targetScope)
    if (dto.operation === 'move') {
      await this.deleteSourceRecords(supabase, sourceScope, extracted)
    }

    return { success: true, matched, copied, moved: dto.operation === 'move' ? copied : 0 }
  }

  private scopeKey(scope: BrainNodeTransferScopeResolution): string {
    return scope.type === 'campaign' ? `campaign:${scope.campaignId}` : `brain:${scope.brainId}`
  }

  private async resolveScope(
    supabase: SupabaseClient,
    userId: string,
    scope: BrainNodeTransferScope,
  ): Promise<BrainNodeTransferScopeResolution> {
    if (scope.type === 'campaign') {
      if (!scope.campaign_id?.trim()) throw new Error('campaign_id is required for campaign scope')
      const campaign = await this.transferRepository.findCampaignForScope(
        supabase,
        scope.campaign_id.trim(),
        userId,
      )
      if (!campaign) throw new Error('Campaign not found')
      return { type: 'campaign', campaignId: String(campaign.id) }
    }

    const agentId = scope.type === 'agent' ? scope.agent_id?.trim() || null : null
    const brain = await this.transferRepository.findBrainForScope(supabase, userId, agentId)
    if (!brain?.id) throw new Error('Target brain not found')
    return { type: 'brain', brainId: String(brain.id), agentId }
  }

  private async extractRecords(
    supabase: SupabaseClient,
    dto: BrainNodeTransferDto,
    sourceScope: BrainNodeTransferScopeResolution,
  ): Promise<BrainNodeTransferExtractedRecords> {
    const connectedIds = Array.from(new Set((dto.connected_node_ids ?? []).filter(Boolean)))
    const memories: Array<Record<string, unknown>> = []
    const snapshots: Array<Record<string, unknown>> = []
    const skSources: Array<Record<string, unknown>> = []
    const skEntries: Array<Record<string, unknown>> = []
    const campaignNodes: Array<Record<string, unknown>> = []
    let sourceSkSourceId: string | null = null

    if (sourceScope.type === 'campaign') {
      const ids = dto.node_type === 'sk_entry' ? [dto.node_id] : connectedIds
      if (!ids.length) throw new Error('No connected nodes found for source transfer')
      const nodes = await this.transferRepository.findCampaignNodesByIds(
        supabase,
        sourceScope.campaignId,
        ids,
      )
      campaignNodes.push(...nodes)
      if (!campaignNodes.length) throw new Error('No campaign nodes found to transfer')
      return { memories, snapshots, skSources, skEntries, campaignNodes, sourceSkSourceId }
    }

    const sourceBrainId = sourceScope.brainId
    if (dto.node_type === 'memory') {
      const data = await this.transferRepository.findMemoryById(
        supabase,
        sourceBrainId,
        dto.node_id,
      )
      if (!data) throw new Error('Memory not found')
      memories.push(data)
      return { memories, snapshots, skSources, skEntries, campaignNodes, sourceSkSourceId }
    }

    if (dto.node_type === 'snapshot') {
      const data = await this.transferRepository.findSnapshotById(
        supabase,
        sourceBrainId,
        dto.node_id,
      )
      if (!data) throw new Error('Snapshot not found')
      snapshots.push(data)
      return { memories, snapshots, skSources, skEntries, campaignNodes, sourceSkSourceId }
    }

    if (dto.node_type === 'sk_entry') {
      const data = await this.transferRepository.findSkEntryById(
        supabase,
        sourceBrainId,
        dto.node_id,
      )
      if (!data) throw new Error('Knowledge entry not found')
      skEntries.push(data)
      return { memories, snapshots, skSources, skEntries, campaignNodes, sourceSkSourceId }
    }

    if (dto.node_type === 'sk_source') {
      const source = await this.transferRepository.findSkSourceById(
        supabase,
        sourceBrainId,
        dto.node_id,
      )
      if (!source) throw new Error('Source not found')
      skSources.push(source)
      sourceSkSourceId = String(source.id)
      const entries = await this.transferRepository.findSkEntriesBySource(
        supabase,
        sourceBrainId,
        dto.node_id,
      )
      skEntries.push(...entries)
      return { memories, snapshots, skSources, skEntries, campaignNodes, sourceSkSourceId }
    }

    if (dto.node_type === 'experience') {
      const ids = connectedIds
      if (!ids.length) throw new Error('No connected nodes found for source transfer')
      const records = await this.transferRepository.findConnectedRecords(supabase, sourceBrainId, ids)
      memories.push(...records.memories)
      snapshots.push(...records.snapshots)
      skEntries.push(...records.skEntries)
      return { memories, snapshots, skSources, skEntries, campaignNodes, sourceSkSourceId }
    }

    throw new Error('Unsupported node_type')
  }

  private async deleteSourceRecords(
    supabase: SupabaseClient,
    sourceScope: BrainNodeTransferScopeResolution,
    extracted: BrainNodeTransferExtractedRecords,
  ): Promise<void> {
    if (sourceScope.type === 'campaign') {
      const ids = extracted.campaignNodes.map((node) => String(node.id))
      if (!ids.length) return
      await this.transferRepository.deleteCampaignNodes(supabase, sourceScope.campaignId, ids)
      return
    }

    const memoryIds = extracted.memories.map((row) => String(row.id))
    if (memoryIds.length > 0) {
      await this.transferRepository.deleteMemories(supabase, sourceScope.brainId, memoryIds)
    }

    const snapshotIds = extracted.snapshots.map((row) => String(row.id))
    if (snapshotIds.length > 0) {
      await this.transferRepository.deleteSnapshots(supabase, sourceScope.brainId, snapshotIds)
    }

    const skEntryIds = extracted.skEntries.map((row) => String(row.id))
    if (skEntryIds.length > 0) {
      await this.transferRepository.deleteSkEntries(supabase, sourceScope.brainId, skEntryIds)
    }

    if (extracted.sourceSkSourceId) {
      await this.transferRepository.deleteSkSource(
        supabase,
        sourceScope.brainId,
        extracted.sourceSkSourceId,
      )
    }
  }
}
