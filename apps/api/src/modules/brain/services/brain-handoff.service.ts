import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainHandoffRepository } from '../repositories/brain-handoff.repository'
import { BrainHandoffBrainCopyService } from './brain-handoff-brain-copy.service'
import { BrainHandoffTargetResolverService } from './brain-handoff-target-resolver.service'

export type BrainHandoffTarget =
  | { type: 'default' }
  | { type: 'agent'; agentKey: string }
  | { type: 'campaign'; campaignId: string }

export interface BrainHandoffResult {
  target_brain_id: string | null
  target_campaign_id: string | null
  copied: {
    memories: number
    snapshots: number
    sk_sources: number
    sk_entries: number
    narrative_pages: number
    narrative_links: number
    memory_connections: number
    snapshot_edges: number
    content_hashes: number
    campaign_nodes: number
  }
}

@Injectable()
export class BrainHandoffService {
  constructor(
    private readonly targetResolver: BrainHandoffTargetResolverService,
    private readonly handoffRepository: BrainHandoffRepository,
    private readonly brainCopyService: BrainHandoffBrainCopyService,
  ) {}

  async copyAllFromBrain(
    supabase: SupabaseClient,
    userId: string,
    sourceBrainId: string,
    target: BrainHandoffTarget,
    orgId?: string | null,
  ): Promise<BrainHandoffResult> {
    if (!sourceBrainId?.trim()) throw new Error('sourceBrainId is required')

    const targetResolved = await this.targetResolver.resolveTarget(
      supabase,
      userId,
      target,
      orgId ?? null,
    )

    if (targetResolved.type === 'brain' && targetResolved.brainId === sourceBrainId) {
      throw new Error('Handoff source and target brains must be different')
    }

    if (targetResolved.type === 'campaign') {
      const copied = await this.copyToCampaign(
        supabase,
        userId,
        sourceBrainId,
        targetResolved.campaignId,
      )
      return {
        target_brain_id: null,
        target_campaign_id: targetResolved.campaignId,
        copied,
      }
    }

    const copied = await this.brainCopyService.copyToBrain(
      supabase,
      sourceBrainId,
      targetResolved.brainId,
      targetResolved.agentId,
    )
    return {
      target_brain_id: targetResolved.brainId,
      target_campaign_id: null,
      copied,
    }
  }

  /**
   * Flatten a source brain into campaign_nodes. Connections / edges / narrative
   * links / content_hashes do not have campaign_nodes equivalents and are dropped.
   */
  private async copyToCampaign(
    supabase: SupabaseClient,
    userId: string,
    sourceBrainId: string,
    targetCampaignId: string,
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

    const rows: Array<Record<string, unknown>> = []

    const memories = await this.handoffRepository.findRowsForBrain(
      supabase,
      'ns_memories',
      sourceBrainId,
    )

    for (const row of memories ?? []) {
      rows.push({
        campaign_id: targetCampaignId,
        user_id: userId,
        node_type: 'document',
        title: String(row.source_title ?? row.memory_type ?? 'Memory'),
        content: String(row.content ?? ''),
        source_type: 'upload',
        source_id: String(row.id ?? ''),
        metadata: { imported_from: 'brain_memory', source_memory_id: row.id },
        domain: 'general',
        media_type: row.media_type ?? 'text',
        media_url: row.media_url ?? null,
        media_mime_type: row.media_mime_type ?? null,
      })
      counts.memories += 1
    }

    const snapshots = await this.handoffRepository.findRowsForBrain(
      supabase,
      'ns_snapshots',
      sourceBrainId,
    )

    for (const row of snapshots ?? []) {
      const content = [
        `Core: ${String(row.core ?? '')}`,
        row.one_liner ? `One-liner: ${String(row.one_liner)}` : '',
        row.story ? `Story: ${String(row.story)}` : '',
        row.method ? `Method: ${String(row.method)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
        .trim()
      rows.push({
        campaign_id: targetCampaignId,
        user_id: userId,
        node_type: 'document',
        title: String(row.name ?? row.type ?? 'Snapshot'),
        content: content || String(row.core ?? ''),
        source_type: 'upload',
        source_id: String(row.id ?? ''),
        metadata: { imported_from: 'brain_snapshot', source_snapshot_id: row.id },
        domain: 'general',
        media_type: 'text',
        media_url: null,
        media_mime_type: null,
      })
      counts.snapshots += 1
    }

    const entries = await this.handoffRepository.findRowsForBrain(
      supabase,
      'ns_sk_entries',
      sourceBrainId,
    )

    for (const row of entries ?? []) {
      rows.push({
        campaign_id: targetCampaignId,
        user_id: userId,
        node_type: String(row.entry_type ?? 'concept'),
        title: String(row.title ?? 'Knowledge Entry'),
        content: String(row.content ?? row.title ?? ''),
        source_type: 'upload',
        source_id: String(row.id ?? ''),
        metadata: { imported_from: 'brain_sk_entry', source_entry_id: row.id },
        domain: String(row.domain ?? 'general'),
        media_type: 'text',
        media_url: null,
        media_mime_type: null,
      })
      counts.sk_entries += 1
    }

    if (rows.length > 0) {
      await this.handoffRepository.insertCampaignNodes(supabase, rows)
      counts.campaign_nodes = rows.length
    }

    return counts
  }
}
