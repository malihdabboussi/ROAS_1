import { adminGet, adminPost } from '@/lib/api/admin-client'
import type { InstructionAuditResponse, InstructionRepairResponse } from '../types'

export type InstructionGovernanceFilters = {
  agent_key?: string
  user_id?: string
  org_id?: string
}

function queryString(filters: InstructionGovernanceFilters): string {
  const params = new URLSearchParams()
  if (filters.agent_key?.trim()) params.set('agent_key', filters.agent_key.trim())
  if (filters.user_id?.trim()) params.set('user_id', filters.user_id.trim())
  if (filters.org_id?.trim()) params.set('org_id', filters.org_id.trim())
  const q = params.toString()
  return q ? `?${q}` : ''
}

export async function fetchInstructionAudit(
  filters: InstructionGovernanceFilters = {},
): Promise<InstructionAuditResponse> {
  return adminGet<InstructionAuditResponse>(`instruction-governance${queryString(filters)}`)
}

export async function runInstructionRepair(
  filters: InstructionGovernanceFilters = {},
): Promise<InstructionRepairResponse> {
  return adminPost<InstructionRepairResponse>('instruction-governance/repair', filters)
}
