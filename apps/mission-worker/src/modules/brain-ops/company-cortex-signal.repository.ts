import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../lib/services/database.service'

export const COMPANY_CORTEX_AUTO_PROMOTE_CONFIDENCE = 0.8

export function shouldAutoPromoteCompanyCortexSignal(confidence: number): boolean {
  return Number.isFinite(confidence) && confidence >= COMPANY_CORTEX_AUTO_PROMOTE_CONFIDENCE
}

export type CompanyCortexSignalDraft = {
  org_id: string
  brain_id: string
  dream_run_id: string | null
  signal_type:
    | 'belief'
    | 'standard'
    | 'move'
    | 'anti_pattern'
    | 'protocol'
    | 'decision'
    | 'tension_candidate'
    | 'retrieval_rule'
  truth: string
  scope: Record<string, unknown>
  evidence_refs: Array<Record<string, unknown>>
  confidence: number
  reason: string | null
  context_form: string | null
  status: 'proposed' | 'active' | 'rejected' | 'expired' | 'merged'
  source: string
  evidence_started_at?: string | null
  evidence_ended_at?: string | null
  valid_from?: string | null
  valid_until?: string | null
  temporal_status?: string | null
  temporal_confidence?: number | null
  temporal_source?: string | null
}

export type InsertedCompanyCortexSignal = {
  id: string
  confidence: number
  status: string
}

@Injectable()
export class CompanyCortexSignalRepository {
  constructor(private readonly database: DatabaseService) {}

  async insertProposedSignals(
    signals: CompanyCortexSignalDraft[],
  ): Promise<InsertedCompanyCortexSignal[]> {
    if (signals.length === 0) return []
    const { data, error } = await this.database
      .getClient()
      .from('company_cortex_signals')
      .insert(signals)
      .select('id, confidence, status')
    if (error) throw new Error(`Failed to insert Company Cortex signals: ${error.message}`)
    return (data ?? []) as InsertedCompanyCortexSignal[]
  }

  async promoteHighConfidenceSignals(input: {
    brainId: string
    orgId: string
    signalIds: string[]
    reviewedBy: string
  }): Promise<string[]> {
    if (input.signalIds.length === 0) return []
    const reviewedAt = new Date().toISOString()
    const { data, error } = await this.database
      .getClient()
      .from('company_cortex_signals')
      .update({
        status: 'active',
        reviewed_by: input.reviewedBy,
        reviewed_at: reviewedAt,
        review_decision: 'auto_high_confidence',
        confidence_basis: {
          review_gate: {
            decision: 'auto_high_confidence',
            reviewed_by: input.reviewedBy,
            reviewed_at: reviewedAt,
            threshold: COMPANY_CORTEX_AUTO_PROMOTE_CONFIDENCE,
          },
        },
      })
      .eq('brain_id', input.brainId)
      .eq('org_id', input.orgId)
      .eq('status', 'proposed')
      .in('id', input.signalIds)
      .select('id')
    if (error) throw new Error(`Failed to auto-promote Company Cortex signals: ${error.message}`)
    return (data ?? []).map((row) => String((row as { id: string }).id))
  }

  /**
   * Mirrors apps/api company-cortex.repository insertFormationOutbox.
   * Auto path uses payload.source = 'auto_high_confidence'.
   */
  async insertFormationOutbox(input: {
    brainId: string
    orgId: string
    userId: string
    signalId: string
    source?: 'human_review' | 'auto_high_confidence'
  }): Promise<void> {
    const source = input.source ?? 'human_review'
    const { error } = await this.database
      .getClient()
      .from('brain_ops_outbox')
      .insert({
        brain_id: input.brainId,
        user_id: input.userId,
        org_id: input.orgId,
        event_type: 'company_cortex_formation',
        dedupe_key: `company-cortex-formation-review-${input.brainId}-${input.signalId}`,
        payload: { source, signal_ids: [input.signalId] },
      })
    if (error) throw new Error(`Failed to enqueue Company Cortex formation: ${error.message}`)
  }
}
