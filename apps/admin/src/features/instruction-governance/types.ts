export type InstructionAuditStatus =
  | 'ok'
  | 'missing_contracts'
  | 'stale_contracts'
  | 'missing_skill'

export type InstructionAuditSourceKind =
  | 'generated_vibey_api'
  | 'db_agent_skill'
  | 'db_agent_tools'

export type InstructionCustomClassification =
  | 'generated_placeholder'
  | 'platform_template_copy'
  | 'user_authored_custom'
  | 'org_override'

export type InstructionContractVersionStatus =
  | 'current'
  | 'missing_contract'
  | 'missing_version'
  | 'stale'
  | 'future'

export type InstructionContractVersionFinding = {
  contractId: string
  title: string
  expectedVersion: number
  renderedVersion: number | null
  versionStatus: InstructionContractVersionStatus
  missingRequiredConcepts: string[]
}

export type InstructionAuditFinding = {
  agentKey: string
  userId: string | null
  orgId: string | null
  sourceKind: InstructionAuditSourceKind
  target: 'vibey-api' | 'TOOLS.md'
  status: InstructionAuditStatus
  missingContracts: string[]
  staleContracts: string[]
  missingRequiredConcepts: Array<{ contractId: string; missingConcepts: string[] }>
  contractVersions: InstructionContractVersionFinding[]
  missingActions: string[]
  classification?: InstructionCustomClassification
  autoRepairAllowed?: boolean
  repairPolicyReason?: string
  message: string
}

export type InstructionAuditResponse = {
  ok: boolean
  findings: InstructionAuditFinding[]
  summary: Record<InstructionAuditStatus, number>
}

export type InstructionRepairResponse = {
  ok: boolean
  repaired: Array<{
    id: string
    agentKey: string
    userId: string | null
    orgId: string | null
    before: InstructionAuditFinding
    after: InstructionAuditFinding
  }>
  skipped: Array<{
    id: string
    agentKey: string
    userId: string | null
    orgId: string | null
    reason: string
  }>
  syncResults: unknown[]
}
