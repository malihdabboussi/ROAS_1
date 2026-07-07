import { Injectable, Logger } from '@nestjs/common'
import { BrainOpsHookRepository } from '../repositories/brain-ops-hook.repository'

const MEMORY_THRESHOLD = 10
const CUSTOMER_AVATAR_THRESHOLD = 25
const SYNC_BATCH_SIZE = 50
const MAX_SYNC_BATCHES = 40
const SYNC_BATCH_STAGGER_MS = 5 * 60_000

type BrainRecord = {
  owner_id: string
  org_id: string | null
  agent_id: string | null
  campaign_id: string | null
  is_default: boolean
  last_library_sync_at: string | null
}

type KnowledgeEntry = Record<string, unknown>
type EntryType = 'memory' | 'sk_entry' | 'campaign_node'

@Injectable()
export class BrainOpsHookService {
  private readonly logger = new Logger(BrainOpsHookService.name)

  constructor(private readonly brainOpsRepository: BrainOpsHookRepository) {}

  async enqueueManualCortexCrystallization(
    brainId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<{
    librarySyncEnqueued: boolean
    patternAnalysisEnqueued: boolean
    timelineSynthesisEnqueued: boolean
  }> {
    const brain = await this.brainOpsRepository.findBrainForManualCortex(brainId)
    if (!brain?.owner_id) throw new Error('Brain not found')
    const ownsBrain = brain.owner_id === userId
    const sharesOrg = orgId != null && brain.org_id === orgId
    if (!ownsBrain && !sharesOrg) throw new Error('Not authorized for this brain')
    if (brain.scope === 'company') throw new Error('Company Cortex uses daily dream formation')

    await this.brainOpsRepository.enableCortexMax(brainId)

    const lastSyncAt = brain.last_library_sync_at ?? '2020-01-01T00:00:00Z'
    const batchCount = await this.enqueueLibrarySyncBatches(
      brainId,
      brain as BrainRecord,
      lastSyncAt,
      'manual',
    )

    const patternAt = new Date(
      Date.now() + Math.max(1, batchCount) * SYNC_BATCH_STAGGER_MS,
    ).toISOString()
    const { error: patternErr } = await this.brainOpsRepository.insertOutbox({
      brain_id: brainId,
      user_id: brain.owner_id,
      org_id: brain.org_id ?? null,
      event_type: 'brain_pattern_analysis',
      dedupe_key: `brain-pattern-analysis-manual-${brainId}-${Date.now()}`,
      // Run pattern analysis after the staggered sync batches have landed.
      next_attempt_at: patternAt,
      payload: { manual: true },
    })
    if (patternErr) throw new Error(`Failed to enqueue pattern analysis: ${patternErr.message}`)

    const { error: timelineErr } = await this.brainOpsRepository.insertOutbox({
      brain_id: brainId,
      user_id: brain.owner_id,
      org_id: brain.org_id ?? null,
      event_type: 'brain_timeline_synthesis',
      dedupe_key: `brain-timeline-synthesis-manual-${brainId}-${Date.now()}`,
      next_attempt_at: new Date(Date.parse(patternAt) + 2 * 60_000).toISOString(),
      payload: { manual: true },
    })
    if (timelineErr) throw new Error(`Failed to enqueue timeline synthesis: ${timelineErr.message}`)

    this.logger.log(
      `Manual Cortex crystallization enqueued for brain ${brainId.slice(0, 8)} (${batchCount} sync batches)`,
    )
    return {
      librarySyncEnqueued: batchCount > 0,
      patternAnalysisEnqueued: true,
      timelineSynthesisEnqueued: true,
    }
  }

  async onMemoriesSaved(brainId: string, count: number): Promise<void> {
    try {
      const { data: newCount, error: rpcErr } = await this.brainOpsRepository.incrementCounter(
        brainId,
        'memories_since_last_sync',
        count,
      )
      if (rpcErr) {
        this.logger.warn(`Counter increment failed: ${rpcErr.message}`)
        return
      }

      if ((newCount ?? 0) < MEMORY_THRESHOLD) return

      const brain = await this.brainOpsRepository.findBrainForLibrarySync(brainId)
      if (!brain?.owner_id) return

      // Clamp the counter even when cortex_max is off so it can't grow unbounded;
      // enabling Cortex Max later backfills from the watermark anyway.
      await this.brainOpsRepository.resetMemoriesSinceLastSync(brainId)
      if (brain.cortex_max !== true) return

      const lastSyncAt = brain.last_library_sync_at ?? '2020-01-01T00:00:00Z'
      const batches = await this.enqueueLibrarySyncBatches(
        brainId,
        brain as BrainRecord,
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
    brain: BrainRecord,
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

      const { error: insertErr } = await this.brainOpsRepository.insertOutbox({
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
      const { data: newCount, error: rpcErr } = await this.brainOpsRepository.incrementCounter(
        brainId,
        'pages_updated_since_last_analysis',
        pagesCount,
      )
      if (rpcErr) {
        this.logger.warn(`Pages counter increment failed: ${rpcErr.message}`)
        return
      }

      if ((newCount ?? 0) < 5) return

      const brain = await this.brainOpsRepository.findBrainForPagesUpdated(brainId)
      if (!brain?.owner_id) return
      if (brain.cortex_max !== true) return

      await this.brainOpsRepository.resetPagesUpdatedSinceLastAnalysis(brainId)

      const { error: insertErr } = await this.brainOpsRepository.insertOutbox({
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

      const { error: timelineErr } = await this.brainOpsRepository.insertOutbox({
        brain_id: brainId,
        user_id: brain.owner_id,
        org_id: brain.org_id ?? null,
        event_type: 'brain_timeline_synthesis',
        dedupe_key: `brain-timeline-synthesis-${brainId}-${Date.now()}`,
        next_attempt_at: new Date(Date.now() + 2 * 60_000).toISOString(),
        payload: {},
      })
      if (timelineErr) {
        this.logger.warn(`Failed to insert timeline synthesis outbox: ${timelineErr.message}`)
      }

      this.logger.log(`Brain ops outbox: brain_pattern_analysis for brain ${brainId.slice(0, 8)}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Brain ops pages updated hook failed: ${msg}`)
    }
  }

  async onCustomerMemoriesSaved(brainId: string, count: number): Promise<void> {
    try {
      const { data: newCount, error: rpcErr } = await this.brainOpsRepository.incrementCounter(
        brainId,
        'customer_memories_since_last_avatar_pass',
        count,
      )
      if (rpcErr) {
        this.logger.warn(`Customer avatar counter increment failed: ${rpcErr.message}`)
        return
      }

      if ((newCount ?? 0) < CUSTOMER_AVATAR_THRESHOLD) return

      const brain = await this.brainOpsRepository.findBrainForCustomerAvatar(brainId)
      if (!brain?.owner_id) return
      if (brain.scope !== 'customer') return
      if (brain.cortex_max !== true) return

      await this.brainOpsRepository.resetCustomerMemoriesSinceLastAvatarPass(brainId)

      const { error: insertErr } = await this.brainOpsRepository.insertOutbox({
        brain_id: brainId,
        user_id: brain.owner_id,
        org_id: brain.org_id ?? null,
        event_type: 'brain_avatar_synthesis',
        dedupe_key: `brain-avatar-synthesis-${brainId}-${Date.now()}`,
        payload: {},
      })

      if (insertErr) {
        this.logger.warn(`Failed to insert avatar synthesis outbox: ${insertErr.message}`)
        return
      }

      this.logger.log(`Brain ops outbox: brain_avatar_synthesis for brain ${brainId.slice(0, 8)}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Customer avatar hook failed: ${msg}`)
    }
  }

  private async fetchNewMemories(brainId: string, since: string): Promise<KnowledgeEntry[]> {
    return (await this.brainOpsRepository.fetchNewMemories(
      brainId,
      since,
      SYNC_BATCH_SIZE,
    )) as KnowledgeEntry[]
  }

  private async fetchNewSkEntries(brainId: string, since: string): Promise<KnowledgeEntry[]> {
    return (await this.brainOpsRepository.fetchNewSkEntries(
      brainId,
      since,
      SYNC_BATCH_SIZE,
    )) as KnowledgeEntry[]
  }

  private async fetchNewCampaignNodes(
    campaignId: string,
    since: string,
  ): Promise<KnowledgeEntry[]> {
    return (await this.brainOpsRepository.fetchNewCampaignNodes(
      campaignId,
      since,
      SYNC_BATCH_SIZE,
    )) as KnowledgeEntry[]
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
