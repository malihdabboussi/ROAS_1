import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../lib/services/database.service'

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

@Injectable()
export class CompanyCortexSignalRepository {
  constructor(private readonly database: DatabaseService) {}

  async insertProposedSignals(signals: CompanyCortexSignalDraft[]): Promise<number> {
    if (signals.length === 0) return 0
    const { error } = await this.database.getClient().from('company_cortex_signals').insert(signals)
    if (error) throw new Error(`Failed to insert Company Cortex signals: ${error.message}`)
    return signals.length
  }
}
