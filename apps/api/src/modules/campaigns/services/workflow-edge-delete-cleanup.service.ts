import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { WorkflowEdgeDeleteCleanupRepository } from '../repositories/workflow-edge-delete-cleanup.repository'

type WorkflowEdgeType =
  | 'funnel_conversion_to_sequence'
  | 'sequence_complete_to_sequence'
  | 'funnel_to_presentation'

type WorkflowEdgeRow = {
  from_id: string
  to_id: string
}

@Injectable()
export class WorkflowEdgeDeleteCleanupService {
  constructor(
    private readonly repo: WorkflowEdgeDeleteCleanupRepository = new WorkflowEdgeDeleteCleanupRepository(),
  ) {}

  async cancelUnsentForEdge(
    supabase: SupabaseClient,
    edge: WorkflowEdgeRow,
    edgeType: WorkflowEdgeType,
  ) {
    if (edgeType === 'funnel_conversion_to_sequence') {
      const leadIds = await this.repo.listLeadIdsForFunnel(supabase, String(edge.from_id))
      await this.cancelUnsentSchedulesForLeadsInSequence(
        supabase,
        String(edge.to_id),
        leadIds,
        'Cancelled by workflow edge delete (funnel->sequence)',
      )
    }

    if (edgeType === 'sequence_complete_to_sequence') {
      const leadIds = await this.repo.listLeadIdsForSourceSequence(supabase, String(edge.from_id))
      await this.cancelUnsentSchedulesForLeadsInSequence(
        supabase,
        String(edge.to_id),
        leadIds,
        'Cancelled by workflow edge delete (sequence->sequence)',
      )
    }
  }

  private async cancelUnsentSchedulesForLeadsInSequence(
    supabase: SupabaseClient,
    sequenceId: string,
    leadIds: string[],
    reason: string,
  ): Promise<void> {
    if (leadIds.length === 0) return
    const now = new Date().toISOString()

    await this.repo.cancelUnsentSchedulesForLeadsInSequence(
      supabase,
      sequenceId,
      leadIds,
      reason,
      now,
    )
    await this.repo.markPendingSequenceSendsSkipped(supabase, sequenceId, leadIds, now)
  }
}
