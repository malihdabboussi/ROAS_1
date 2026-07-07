import { createHash, randomUUID } from 'crypto'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainNodeTransferRepository } from '../repositories/brain-node-transfer.repository'
import {
  cloneCampaignNode,
  memoriesGroupKey,
  memoryToCampaignNode,
  skEntryToCampaignNode,
  snapshotToCampaignNode,
} from './brain-node-transfer-mappers'
import type {
  BrainNodeTransferExtractedRecords,
  BrainNodeTransferScopeResolution,
} from './brain-node-transfer.types'

@Injectable()
export class BrainNodeTransferCopyService {
  constructor(private readonly transferRepository: BrainNodeTransferRepository) {}

  async copyRecords(
    supabase: SupabaseClient,
    userId: string,
    extracted: BrainNodeTransferExtractedRecords,
    targetScope: BrainNodeTransferScopeResolution,
  ): Promise<number> {
    if (targetScope.type === 'campaign') {
      return this.copyToCampaign(supabase, userId, extracted, targetScope.campaignId)
    }

    return this.copyToBrain(supabase, extracted, targetScope)
  }

  private async copyToCampaign(
    supabase: SupabaseClient,
    userId: string,
    extracted: BrainNodeTransferExtractedRecords,
    campaignId: string,
  ): Promise<number> {
    const rows: Array<Record<string, unknown>> = []
    const sharedSourceId =
      extracted.memories.length > 1 || extracted.skEntries.length > 1
        ? `transfer-${randomUUID()}`
        : null
    const sharedSourceTitle =
      extracted.memories.length > 0
        ? String(
            extracted.memories[0].source_title ??
              extracted.memories[0].memory_type ??
              'Imported Source',
          )
        : extracted.skEntries.length > 0
          ? String(extracted.skEntries[0].title ?? 'Imported Source')
          : null

    for (const row of extracted.memories) {
      const node = memoryToCampaignNode(row, campaignId, userId)
      if (sharedSourceId) {
        node.source_id = sharedSourceId
        node.source_type = 'upload'
        if (sharedSourceTitle) node.title = sharedSourceTitle
      }
      rows.push(node)
    }
    for (const row of extracted.snapshots) {
      rows.push(snapshotToCampaignNode(row, campaignId, userId))
    }
    for (const row of extracted.skEntries) {
      const node = skEntryToCampaignNode(row, campaignId, userId)
      if (sharedSourceId) {
        node.source_id = sharedSourceId
        node.source_type = 'upload'
      }
      rows.push(node)
    }
    for (const row of extracted.campaignNodes) {
      rows.push(cloneCampaignNode(row, campaignId, userId))
    }
    if (!rows.length) return 0
    await this.transferRepository.insertCampaignNodes(supabase, rows)
    return rows.length
  }

  private async copyToBrain(
    supabase: SupabaseClient,
    extracted: BrainNodeTransferExtractedRecords,
    targetScope: Extract<BrainNodeTransferScopeResolution, { type: 'brain' }>,
  ): Promise<number> {
    const targetBrainId = targetScope.brainId
    const isTargetSkBrain = !!targetScope.agentId
    let copied = 0
    const sourceIdMap = new Map<string, string>()

    copied += await this.copyMemoriesToBrain(
      supabase,
      extracted,
      targetBrainId,
      targetScope.agentId,
      isTargetSkBrain,
      sourceIdMap,
    )
    copied += await this.copySnapshotsToBrain(supabase, extracted, targetBrainId)
    copied += await this.copySourcesToBrain(supabase, extracted, targetBrainId, sourceIdMap)
    copied += await this.importCampaignSources(supabase, extracted, targetBrainId, sourceIdMap)
    copied += await this.copyEntriesToBrain(supabase, extracted, targetBrainId, sourceIdMap)

    return copied
  }

  private async copyMemoriesToBrain(
    supabase: SupabaseClient,
    extracted: BrainNodeTransferExtractedRecords,
    targetBrainId: string,
    agentId: string | null,
    isTargetSkBrain: boolean,
    sourceIdMap: Map<string, string>,
  ): Promise<number> {
    if (extracted.memories.length === 0) return 0
    if (isTargetSkBrain) {
      return this.copyMemoriesAsEntries(supabase, extracted, targetBrainId, sourceIdMap)
    }

    const memoryRows = extracted.memories.map((row) => ({
      content: row.content,
      content_hash: row.content_hash,
      memory_type: row.memory_type,
      source_type: row.source_type,
      source_id: row.source_id,
      source_title: row.source_title,
      speaker: row.speaker,
      confidence: row.confidence,
      significance: row.significance,
      tags: row.tags ?? [],
      metadata: row.metadata ?? {},
      media_type: row.media_type ?? 'text',
      media_url: row.media_url ?? null,
      media_mime_type: row.media_mime_type ?? null,
      recalled_count: 0,
      brain_id: targetBrainId,
      agent_id: agentId,
    }))
    await this.transferRepository.insertMemories(supabase, memoryRows)
    return memoryRows.length
  }

  private async copyMemoriesAsEntries(
    supabase: SupabaseClient,
    extracted: BrainNodeTransferExtractedRecords,
    targetBrainId: string,
    sourceIdMap: Map<string, string>,
  ): Promise<number> {
    const groupKey = memoriesGroupKey(extracted.memories)
    const newSourceId = randomUUID()
    sourceIdMap.set(groupKey, newSourceId)
    const sample = extracted.memories[0]
    await this.transferRepository.insertSkSource(
      supabase,
      {
        id: newSourceId,
        brain_id: targetBrainId,
        source_type: String(sample.source_type ?? 'document'),
        title: String(sample.source_title ?? sample.memory_type ?? 'Imported Source'),
        metadata: { imported_from: 'brain_experience' },
        status: 'ready',
        entries_count: extracted.memories.length,
        domain: 'general',
        tags: [],
        ingested_at: new Date().toISOString(),
      },
      'Failed to create source',
    )
    const entryRows = extracted.memories.map((row) => {
      const content = String(row.content ?? '')
      return {
        brain_id: targetBrainId,
        source_id: newSourceId,
        title: String(row.source_title ?? row.memory_type ?? 'Memory'),
        content,
        content_hash: createHash('sha256').update(content.trim().toLowerCase()).digest('hex'),
        entry_type: 'concept',
        domain: 'general',
        confidence: Number(row.confidence ?? 0.8),
        mastery: 0,
        tags: (row.tags as string[]) ?? [],
      }
    })
    await this.transferRepository.insertSkEntries(
      supabase,
      entryRows,
      'Failed to copy memories as entries',
    )
    return 1 + entryRows.length
  }

  private async copySnapshotsToBrain(
    supabase: SupabaseClient,
    extracted: BrainNodeTransferExtractedRecords,
    targetBrainId: string,
  ): Promise<number> {
    if (extracted.snapshots.length === 0) return 0
    const snapshotRows = extracted.snapshots.map((row) => ({
      name: row.name,
      type: row.type,
      core: row.core,
      one_liner: row.one_liner,
      story: row.story,
      moment: row.moment,
      emotion: row.emotion,
      source: row.source,
      trigger_pattern: row.trigger_pattern,
      method: row.method,
      steps: row.steps,
      filter: row.filter,
      challenge: row.challenge,
      break_test: row.break_test,
      risks: row.risks,
      proof: row.proof,
      confidence: row.confidence,
      significance_score: row.significance_score,
      tags: row.tags ?? [],
      source_type: row.source_type,
      source_id: row.source_id,
      brain_id: targetBrainId,
    }))
    await this.transferRepository.insertSnapshots(supabase, snapshotRows)
    return snapshotRows.length
  }

  private async copySourcesToBrain(
    supabase: SupabaseClient,
    extracted: BrainNodeTransferExtractedRecords,
    targetBrainId: string,
    sourceIdMap: Map<string, string>,
  ): Promise<number> {
    let copied = 0
    for (const source of extracted.skSources) {
      const newSourceId = randomUUID()
      sourceIdMap.set(String(source.id), newSourceId)
      await this.transferRepository.insertSkSource(
        supabase,
        {
          id: newSourceId,
          brain_id: targetBrainId,
          source_type: source.source_type,
          title: source.title,
          author: source.author,
          url: source.url,
          metadata: source.metadata ?? {},
          status: source.status ?? 'ready',
          entries_count: source.entries_count ?? 0,
          domain: source.domain,
          tags: source.tags ?? [],
          ingested_at: new Date().toISOString(),
        },
        'Failed to copy source',
      )
      copied += 1
    }
    return copied
  }

  private async importCampaignSources(
    supabase: SupabaseClient,
    extracted: BrainNodeTransferExtractedRecords,
    targetBrainId: string,
    sourceIdMap: Map<string, string>,
  ): Promise<number> {
    const groupedBySource = new Map<string, Array<Record<string, unknown>>>()
    for (const node of extracted.campaignNodes) {
      const key = `${String(node.source_type ?? 'upload')}::${String(node.source_id ?? node.title ?? '')}`
      const current = groupedBySource.get(key) ?? []
      current.push(node)
      groupedBySource.set(key, current)
    }

    let copied = 0
    for (const [key, nodes] of groupedBySource.entries()) {
      const sample = nodes[0]
      const newSourceId = randomUUID()
      sourceIdMap.set(key, newSourceId)
      await this.transferRepository.insertSkSource(
        supabase,
        {
          id: newSourceId,
          brain_id: targetBrainId,
          source_type: sample.source_type ?? 'upload',
          title: sample.title ?? 'Campaign Source',
          metadata: { imported_from: 'campaign' },
          status: 'ready',
          entries_count: nodes.length,
          domain: sample.domain ?? 'general',
          tags: [],
          ingested_at: new Date().toISOString(),
        },
        'Failed to import campaign source',
      )
      copied += 1
    }
    return copied
  }

  private async copyEntriesToBrain(
    supabase: SupabaseClient,
    extracted: BrainNodeTransferExtractedRecords,
    targetBrainId: string,
    sourceIdMap: Map<string, string>,
  ): Promise<number> {
    const entriesToCopy = [...extracted.skEntries]
    for (const node of extracted.campaignNodes) {
      entriesToCopy.push({
        id: node.id,
        title: node.title,
        content: node.content,
        entry_type: 'concept',
        domain: node.domain ?? 'general',
        confidence: 0.8,
        mastery: 0,
        tags: [],
        source_id: `${String(node.source_type ?? 'upload')}::${String(
          node.source_id ?? node.title ?? '',
        )}`,
      })
    }

    if (entriesToCopy.length === 0) return 0
    const entryRows = entriesToCopy.map((entry) => {
      const oldSourceId = String(entry.source_id ?? '')
      const remapped = sourceIdMap.get(oldSourceId) ?? sourceIdMap.get(oldSourceId.trim()) ?? null
      const content = String(entry.content ?? entry.title ?? 'Knowledge Entry')
      return {
        brain_id: targetBrainId,
        source_id: remapped,
        title: entry.title ?? entry.name ?? 'Knowledge Entry',
        content,
        content_hash: String(
          entry.content_hash ??
            createHash('sha256').update(content.trim().toLowerCase()).digest('hex'),
        ),
        entry_type: entry.entry_type ?? 'concept',
        domain: entry.domain ?? 'general',
        confidence: Number(entry.confidence ?? 0.8),
        mastery: Number(entry.mastery ?? 0),
        tags: entry.tags ?? [],
      }
    })
    await this.transferRepository.insertSkEntries(
      supabase,
      entryRows,
      'Failed to copy knowledge entries',
    )
    return entryRows.length
  }
}
