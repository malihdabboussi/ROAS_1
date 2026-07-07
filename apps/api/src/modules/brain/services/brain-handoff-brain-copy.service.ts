import { randomUUID } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainHandoffRepository } from '../repositories/brain-handoff.repository'
import type { BrainHandoffResult } from './brain-handoff.service'

@Injectable()
export class BrainHandoffBrainCopyService {
  private readonly logger = new Logger(BrainHandoffBrainCopyService.name)

  constructor(private readonly handoffRepository: BrainHandoffRepository) {}

  async copyToBrain(
    supabase: SupabaseClient,
    sourceBrainId: string,
    targetBrainId: string,
    targetAgentId: string | null,
  ): Promise<BrainHandoffResult['copied']> {
    const counts = {
      memories: 0,
      snapshots: 0,
      sk_sources: 0,
      sk_entries: 0,
      narrative_pages: 0,
      narrative_links: 0,
      memory_connections: 0,
      snapshot_edges: 0,
      content_hashes: 0,
      campaign_nodes: 0,
    }

    const memoryIdMap = new Map<string, string>()
    const snapshotIdMap = new Map<string, string>()
    const skSourceIdMap = new Map<string, string>()
    const skEntryIdMap = new Map<string, string>()
    const narrativePageIdMap = new Map<string, string>()

    {
      const rows = await this.handoffRepository.findRowsForBrain(
        supabase,
        'ns_memories',
        sourceBrainId,
      )
      if (rows && rows.length > 0) {
        const newRows = rows.map((row) => {
          const newId = randomUUID()
          memoryIdMap.set(String(row.id), newId)
          return {
            id: newId,
            brain_id: targetBrainId,
            agent_id: targetAgentId,
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
            source_emotion: row.source_emotion,
            emotional_valence: row.emotional_valence,
            emotional_intensity: row.emotional_intensity,
            speaker_intent: row.speaker_intent,
            recalled_count: 0,
            media_type: row.media_type ?? 'text',
            media_url: row.media_url ?? null,
            media_mime_type: row.media_mime_type ?? null,
          }
        })
        await this.handoffRepository.insertRows(supabase, 'ns_memories', newRows)
        counts.memories = newRows.length
      }
    }

    {
      const rows = await this.handoffRepository.findRowsForBrain(
        supabase,
        'ns_snapshots',
        sourceBrainId,
      )
      if (rows && rows.length > 0) {
        const newRows = rows.map((row) => {
          const newId = randomUUID()
          snapshotIdMap.set(String(row.id), newId)
          return {
            id: newId,
            brain_id: targetBrainId,
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
            agent_id: targetAgentId,
            session_id: row.session_id,
            capture_context: row.capture_context,
          }
        })
        await this.handoffRepository.insertRows(supabase, 'ns_snapshots', newRows)
        counts.snapshots = newRows.length
      }
    }

    {
      const rows = await this.handoffRepository.findRowsForBrain(
        supabase,
        'ns_sk_sources',
        sourceBrainId,
      )
      if (rows && rows.length > 0) {
        const newRows = rows.map((row) => {
          const newId = randomUUID()
          skSourceIdMap.set(String(row.id), newId)
          return {
            id: newId,
            brain_id: targetBrainId,
            source_type: row.source_type,
            title: row.title,
            author: row.author,
            url: row.url,
            metadata: row.metadata ?? {},
            status: row.status ?? 'ready',
            entries_count: row.entries_count ?? 0,
            domain: row.domain,
            tags: row.tags ?? [],
            ingested_at: row.ingested_at ?? new Date().toISOString(),
          }
        })
        await this.handoffRepository.insertRows(supabase, 'ns_sk_sources', newRows)
        counts.sk_sources = newRows.length
      }
    }

    {
      const rows = await this.handoffRepository.findRowsForBrain(
        supabase,
        'ns_sk_entries',
        sourceBrainId,
      )
      if (rows && rows.length > 0) {
        const newRows: Array<Record<string, unknown>> = []
        for (const row of rows) {
          const oldSourceId = row.source_id ? String(row.source_id) : ''
          const remappedSourceId = oldSourceId ? skSourceIdMap.get(oldSourceId) : undefined
          if (!remappedSourceId) {
            this.logger.warn(
              `Skipping sk_entry ${row.id}: source ${oldSourceId} not in source brain`,
            )
            continue
          }
          const newId = randomUUID()
          skEntryIdMap.set(String(row.id), newId)
          newRows.push({
            id: newId,
            brain_id: targetBrainId,
            source_id: remappedSourceId,
            entry_type: row.entry_type,
            title: row.title,
            content: row.content,
            content_hash: row.content_hash,
            domain: row.domain,
            complexity: row.complexity ?? 'foundational',
            prerequisites: row.prerequisites ?? [],
            confidence: row.confidence,
            mastery: row.mastery,
            recall_count: 0,
            tags: row.tags ?? [],
            metadata: row.metadata ?? {},
            media_type: row.media_type ?? null,
            media_url: row.media_url ?? null,
            media_mime_type: row.media_mime_type ?? null,
          })
        }
        if (newRows.length > 0) {
          await this.handoffRepository.insertRows(supabase, 'ns_sk_entries', newRows)
          counts.sk_entries = newRows.length
        }
      }
    }

    {
      const rows = await this.handoffRepository.findRowsForBrain(
        supabase,
        'ns_narrative_pages',
        sourceBrainId,
      )
      if (rows && rows.length > 0) {
        const newRows = rows.map((row) => {
          const newId = randomUUID()
          narrativePageIdMap.set(String(row.id), newId)
          return {
            id: newId,
            brain_id: targetBrainId,
            slug: row.slug,
            title: row.title,
            page_type: row.page_type,
            content_md: row.content_md,
            summary: row.summary,
            source_refs: row.source_refs ?? [],
            last_synthesis_at: row.last_synthesis_at,
            version: row.version ?? 1,
            tags: row.tags ?? [],
            status: row.status ?? 'active',
          }
        })
        await this.handoffRepository.insertRows(supabase, 'ns_narrative_pages', newRows)
        counts.narrative_pages = newRows.length
      }
    }

    if (narrativePageIdMap.size > 0) {
      const sourcePageIds = Array.from(narrativePageIdMap.keys())
      const rows = await this.handoffRepository.findNarrativeLinks(supabase, sourcePageIds)
      if (rows && rows.length > 0) {
        const newRows: Array<Record<string, unknown>> = []
        for (const row of rows) {
          const fromId = narrativePageIdMap.get(String(row.from_page_id))
          const toId = narrativePageIdMap.get(String(row.to_page_id))
          if (!fromId || !toId) continue
          newRows.push({
            from_page_id: fromId,
            to_page_id: toId,
            link_type: row.link_type ?? 'related',
          })
        }
        if (newRows.length > 0) {
          await this.handoffRepository.insertNarrativeLinks(supabase, newRows)
          counts.narrative_links = newRows.length
        }
      }
    }

    if (memoryIdMap.size > 0) {
      const sourceMemoryIds = Array.from(memoryIdMap.keys())
      const rows = await this.handoffRepository.findMemoryConnections(supabase, sourceMemoryIds)
      if (rows && rows.length > 0) {
        const newRows: Array<Record<string, unknown>> = []
        for (const row of rows) {
          const srcId = memoryIdMap.get(String(row.source_memory_id))
          const tgtId = memoryIdMap.get(String(row.target_memory_id))
          if (!srcId || !tgtId) continue
          newRows.push({
            source_memory_id: srcId,
            target_memory_id: tgtId,
            relationship: row.relationship,
            strength: row.strength,
            created_by: row.created_by ?? 'auto',
          })
        }
        if (newRows.length > 0) {
          await this.handoffRepository.insertMemoryConnections(supabase, newRows)
          counts.memory_connections = newRows.length
        }
      }
    }

    if (snapshotIdMap.size > 0) {
      const sourceSnapshotIds = Array.from(snapshotIdMap.keys())
      const rows = await this.handoffRepository.findSnapshotEdges(supabase, sourceSnapshotIds)
      if (rows && rows.length > 0) {
        const newRows: Array<Record<string, unknown>> = []
        for (const row of rows) {
          const srcId = snapshotIdMap.get(String(row.source_id))
          const tgtId = snapshotIdMap.get(String(row.target_id))
          if (!srcId || !tgtId) continue
          newRows.push({
            source_id: srcId,
            target_id: tgtId,
            edge_type: row.edge_type ?? 'related',
            strength: row.strength ?? 0.5,
            context: row.context,
            auto_generated: row.auto_generated ?? false,
          })
        }
        if (newRows.length > 0) {
          await this.handoffRepository.insertSnapshotEdges(supabase, newRows)
          counts.snapshot_edges = newRows.length
        }
      }
    }

    {
      const rows = await this.handoffRepository.findRowsForBrain(
        supabase,
        'ns_content_hashes',
        sourceBrainId,
      )
      if (rows && rows.length > 0) {
        const newRows: Array<Record<string, unknown>> = []
        for (const row of rows) {
          const oldSnapIds = Array.isArray(row.snapshot_ids) ? row.snapshot_ids : []
          const newSnapIds = oldSnapIds
            .map((id: unknown) => snapshotIdMap.get(String(id)))
            .filter((v: string | undefined): v is string => !!v)
          newRows.push({
            brain_id: targetBrainId,
            content_hash: row.content_hash,
            source_type: row.source_type,
            snapshot_ids: newSnapIds,
          })
        }
        if (newRows.length > 0) {
          await this.handoffRepository.upsertContentHashes(supabase, newRows)
          counts.content_hashes = newRows.length
        }
      }
    }

    return counts
  }
}
