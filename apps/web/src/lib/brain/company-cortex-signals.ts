import { backendGet, backendPatch } from '@/lib/api/backend-client'

export interface CompanyCortexSignal {
  id: string
  org_id: string
  brain_id: string
  signal_type: string
  truth: string
  scope: Record<string, unknown>
  evidence_refs: Array<Record<string, unknown>>
  confidence: number
  confidence_basis: Record<string, unknown>
  reason: string | null
  context_form: string | null
  status: string
  source: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_decision: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

export async function fetchCompanyCortexSignals(): Promise<CompanyCortexSignal[]> {
  const res = await backendGet<{ success: boolean; signals: CompanyCortexSignal[] }>(
    '/api/brain/company/signals',
  )
  return res.signals ?? []
}

export async function reviewCompanyCortexSignal(
  signalId: string,
  decision: 'approve' | 'reject',
  note?: string,
): Promise<{ success: boolean; signal: { id: string; status: string } }> {
  return backendPatch<{ success: boolean; signal: { id: string; status: string } }>(
    `/api/brain/company/signals/${encodeURIComponent(signalId)}`,
    { decision, note },
  )
}
