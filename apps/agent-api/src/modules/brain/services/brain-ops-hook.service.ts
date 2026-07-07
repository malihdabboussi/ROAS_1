import { Injectable, Logger } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import {
  BrainIngestionRepository,
  type BrainOpsRecord,
} from '../repositories/brain-ingestion.repository'

const MEMORY_THRESHOLD = 10
const SYNC_BATCH_SIZE = 50
const MAX_SYNC_BATCHES = 40
const SYNC_BATCH_STAGGER_MS = 5 * 60_000

type KnowledgeEntry = Record<string, unknown>
type EntryType = 'memory' | 'sk_entry' | 'campaign_node'

@Injectable()
export class BrainOpsHookService {
  private readonly logger = new Logger(BrainOpsHookService.name)

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: BrainIngestionRepository = new BrainIngestionRepository(),
  ) {}

  async onMemoriesSaved(brainId: string, count: number): Promise<void> {
    try {
      const { data: newCount, error: rpcErr } = await this.repository.incrementBrainCounter(
        this.svc.client,
        { brainId, field: 'memories_since_last_sync', amount: count },
      )
      if (rpcErr) {
        this.logger.warn(`Counter increment failed: ${rpcErr.message}`)
        return
      }

      if ((newCount ?? 0) < MEMORY_THRESHOLD) return

      const { data: brain } = await this.repository.findBrainForLibrarySync(
        this.svc.client,
        brainId,
      )
      if (!brain?.owner_id) return

      // Clamp the counter even when cortex_max is off so it can't grow unbounded;
      // enabling Cortex Max later backfills from the watermark anyway.
      await this.repository.resetBrainMemorySyncCounter(this.svc.client, brainId)
      if (brain.cortex_max !== true) return

      const lastSyncAt = brain.last_library_sync_at ?? '2020-01-01T00:00:00Z'
      const batches = await this.enqueueLibrarySyncBatches(
        brainId,
        brain,
        lastSyncAt,
        'auto',
      )
      if (batches > 0) {
        this.logger.log(
          `Brain ops outbox: ${batches} brain_library_sync batch(es) enqueued (brain ${brainId.slice(0, 8)})`,
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Brain ops hook failed: ${msg}`)
    }
  }

  private async enqueueLibrarySyncBatches(
    brainId: string,
    brain: BrainOpsRecord,
    fromTimestamp: string,
    trigger: 'auto' | 'manual',
  ): Promise<number> {
    const entryType: EntryType = brain.campaign_id
      ? 'campaign_node'
      : brain.agent_id
        ? 'sk_entry'
        : 'memory'
    const brainLabel = brain.campaign_id
      ? 'campaign context'
      : brain.agent_id
        ? `${brain.agent_id} agent brain`
        : 'user brain'

    let cursor = fromTimestamp
    let batches = 0
    while (batches < MAX_SYNC_BATCHES) {
      const entries = brain.campaign_id
        ? await this.fetchNewCampaignNodes(brain.campaign_id, cursor)
        : brain.agent_id
          ? await this.fetchNewSkEntries(brainId, cursor)
          : await this.fetchNewMemories(brainId, cursor)
      if (!entries.length) break

      const lastCreatedAt = entries[entries.length - 1]?.created_at
      const batchMax = typeof lastCreatedAt === 'string' ? lastCreatedAt : null

      const insertErr = await this.repository.insertBrainOpsOutbox(this.svc.client, {
        brain_id: brainId,
        user_id: brain.owner_id,
        org_id: brain.org_id ?? null,
        event_type: 'brain_library_sync',
        dedupe_key: `brain-library-sync-${trigger}-${brainId}-${Date.now()}-${batches}`,
        // Stagger batches so Atlas organizes them sequentially instead of
        // racing over the same pages.
        next_attempt_at: new Date(Date.now() + batches * SYNC_BATCH_STAGGER_MS).toISOString(),
        payload: {
          brain_label: brainLabel,
          entry_type: entryType,
          entry_count: entries.length,
          agent_id: brain.agent_id,
          campaign_id: brain.campaign_id,
          is_default: brain.is_default,
          batch_max_created_at: batchMax,
          formatted_entries: this.formatEntriesBlock(entries, entryType),
        },
      })
      if (insertErr) {
        this.logger.warn(`Failed to insert brain ops outbox: ${insertErr.message}`)
        break
      }

      batches++
      if (entries.length < SYNC_BATCH_SIZE) break
      if (!batchMax || batchMax === cursor) break
      cursor = batchMax
    }
    return batches
  }

  async onPagesUpdated(brainId: string, pagesCount: number): Promise<void> {
    try {
      const { data: newCount, error: rpcErr } = await this.repository.incrementBrainCounter(
        this.svc.client,
        { brainId, field: 'pages_updated_since_last_analysis', amount: pagesCount },
      )
      if (rpcErr) {
        this.logger.warn(`Pages counter increment failed: ${rpcErr.message}`)
        return
      }

      if ((newCount ?? 0) < 5) return

      const { data: brain } = await this.repository.findBrainForPatternAnalysis(
        this.svc.client,
        brainId,
      )
      if (!brain?.owner_id) return
      if (brain.cortex_max !== true) return

      await this.repository.resetBrainPageAnalysisCounter(this.svc.client, brainId)

      const insertErr = await this.repository.insertBrainOpsOutbox(this.svc.client, {
        brain_id: brainId,
        user_id: brain.owner_id,
        org_id: brain.org_id ?? null,
        event_type: 'brain_pattern_analysis',
        dedupe_key: `brain-pattern-analysis-${brainId}-${Date.now()}`,
        payload: {},
      })

      if (insertErr) {
        this.logger.warn(`Failed to insert pattern analysis outbox: ${insertErr.message}`)
        return
      }

      this.logger.log(`Brain ops outbox: brain_pattern_analysis for brain ${brainId.slice(0, 8)}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Brain ops pages updated hook failed: ${msg}`)
    }
  }

  private async fetchNewMemories(brainId: string, since: string): Promise<KnowledgeEntry[]> {
    return this.repository.listNewMemories(this.svc.client, {
      brainId,
      since,
      limit: SYNC_BATCH_SIZE,
    })
  }

  private async fetchNewSkEntries(brainId: string, since: string): Promise<KnowledgeEntry[]> {
    return this.repository.listNewSkEntries(this.svc.client, {
      brainId,
      since,
      limit: SYNC_BATCH_SIZE,
    })
  }

  private async fetchNewCampaignNodes(
    campaignId: string,
    since: string,
  ): Promise<KnowledgeEntry[]> {
    return this.repository.listNewCampaignNodes(this.svc.client, {
      campaignId,
      since,
      limit: SYNC_BATCH_SIZE,
    })
  }

  private formatEntriesBlock(entries: KnowledgeEntry[], entryType: EntryType): string {
    return entries
      .map((e, i) => {
        const date = typeof e.created_at === 'string' ? e.created_at.slice(0, 10) : ''
        if (entryType === 'campaign_node') {
          const domain = e.domain ? ` [${e.domain}]` : ''
          return `${i + 1}. [${e.node_type}]${domain} (${date})\n   "${String(e.title ?? '')}": ${String(e.content ?? '').slice(0, 300)}`
        }
        if (entryType === 'sk_entry') {
          const domain = e.domain ? ` [${e.domain}]` : ''
          return `${i + 1}. [${e.entry_type}]${domain} (${date}, mastery: ${e.mastery ?? 'n/a'})\n   "${String(e.title ?? '')}": ${String(e.content ?? '').slice(0, 300)}`
        }
        const emotion = e.source_emotion
          ? `, emotion: ${e.source_emotion}/${e.emotional_valence ?? ''}`
          : ''
        return `${i + 1}. [${e.memory_type}] (${date}, significance: ${e.significance}${emotion})\n   "${String(e.content).slice(0, 300)}"\n   Source: ${e.source_title ?? e.source_type ?? 'unknown'}`
      })
      .join('\n\n')
  }
}
