import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  hasPlatformToolsRuntimeGuidance,
  PLATFORM_TOOLS_NAMED_CLIENT_LOOKUP_HEADING,
  PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING,
} from '@vibey/agent-policy'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentSyncRepository } from '../repositories/agent-sync.repository'
import {
  AGENT_INSTRUCTION_CONTRACTS,
  getAgentInstructionContractReferencePath,
  type AgentInstructionContract,
  type AgentInstructionContractId,
} from '../contracts/agent-instruction-contracts'
import {
  classifyAgentInstructionCustomRow,
  type AgentInstructionCustomClassification,
} from '../contracts/agent-instruction-custom-policy'
import { generateScopedVibeyApiSkill } from './vibey-api-skill-generator'

type AgentSkillAuditRow = {
  id: string
  user_id: string | null
  org_id: string | null
  agent_key: string
  skill_key: string
  markdown_content: string | null
  is_enabled: boolean
}

type AgentDefinitionAuditRow = {
  id: string
  user_id: string | null
  org_id: string | null
  agent_key: string
  file_name: string
  content: string | null
  source: string | null
}

export type AgentInstructionAuditInput = {
  agent_key?: string
  user_id?: string
  org_id?: string
}

export type AgentInstructionAuditStatus =
  | 'ok'
  | 'missing_contracts'
  | 'stale_contracts'
  | 'missing_skill'
export type AgentInstructionAuditSourceKind =
  | 'generated_vibey_api'
  | 'db_agent_skill'
  | 'db_agent_tools'

export type AgentInstructionContractVersionStatus =
  | 'current'
  | 'missing_contract'
  | 'missing_version'
  | 'stale'
  | 'future'

export type AgentInstructionContractConceptFinding = {
  contractId: AgentInstructionContractId
  missingConcepts: string[]
}

export type AgentInstructionContractVersionFinding = {
  contractId: AgentInstructionContractId
  title: string
  expectedVersion: number
  renderedVersion: number | null
  versionStatus: AgentInstructionContractVersionStatus
  missingRequiredConcepts: string[]
}

export type AgentInstructionAuditFinding = {
  agentKey: string
  userId: string | null
  orgId: string | null
  sourceKind: AgentInstructionAuditSourceKind
  target: 'vibey-api' | 'TOOLS.md'
  status: AgentInstructionAuditStatus
  missingContracts: AgentInstructionContractId[]
  staleContracts: AgentInstructionContractId[]
  missingRequiredConcepts: AgentInstructionContractConceptFinding[]
  contractVersions: AgentInstructionContractVersionFinding[]
  missingActions: string[]
  classification?: AgentInstructionCustomClassification
  autoRepairAllowed?: boolean
  repairPolicyReason?: string
  message: string
}

const AUDIT_GENERATED_ACTIONS = new Set(
  AGENT_INSTRUCTION_CONTRACTS.flatMap((contract) => contract.requiredActions),
)

function extractContractBlock(content: string, title: string): string | null {
  const heading = `### ${title}`
  const start = content.indexOf(heading)
  if (start < 0) return null
  const next = content.indexOf('\n### ', start + heading.length)
  return next < 0 ? content.slice(start) : content.slice(start, next)
}

function renderedProtocolVersion(block: string): number | null {
  const match = block.match(/Protocol version:\s*(\d+)/)
  return match ? Number(match[1]) : null
}

function renderedProtocolIndexVersion(
  content: string,
  contract: AgentInstructionContract,
): number | null {
  const rowStart = `| ${contract.title} | v`
  const start = content.indexOf(rowStart)
  if (start < 0) return null

  const end = content.indexOf('\n', start)
  const row = end < 0 ? content.slice(start) : content.slice(start, end)
  if (!row.includes(`\`${getAgentInstructionContractReferencePath(contract)}\``)) return null

  const match = row.match(/\|\s*v(\d+)\s*\|/)
  return match ? Number(match[1]) : null
}

function evaluateContracts(
  content: string,
  contracts: AgentInstructionContract[] = AGENT_INSTRUCTION_CONTRACTS,
): AgentInstructionContractVersionFinding[] {
  return contracts.map((contract) => {
    const block = extractContractBlock(content, contract.title)
    if (!block) {
      const indexedVersion = renderedProtocolIndexVersion(content, contract)
      if (indexedVersion !== null) {
        const versionStatus: AgentInstructionContractVersionStatus =
          indexedVersion < contract.version
            ? 'stale'
            : indexedVersion > contract.version
              ? 'future'
              : 'current'

        return {
          contractId: contract.id,
          title: contract.title,
          expectedVersion: contract.version,
          renderedVersion: indexedVersion,
          versionStatus,
          missingRequiredConcepts: [],
        }
      }

      return {
        contractId: contract.id,
        title: contract.title,
        expectedVersion: contract.version,
        renderedVersion: null,
        versionStatus: 'missing_contract',
        missingRequiredConcepts: contract.requiredConcepts,
      }
    }

    const renderedVersion = renderedProtocolVersion(block)
    const missingRequiredConcepts = contract.requiredConcepts.filter(
      (concept) => !block.includes(concept),
    )
    const versionStatus: AgentInstructionContractVersionStatus =
      renderedVersion === null
        ? 'missing_version'
        : renderedVersion < contract.version
          ? 'stale'
          : renderedVersion > contract.version
            ? 'future'
            : 'current'

    return {
      contractId: contract.id,
      title: contract.title,
      expectedVersion: contract.version,
      renderedVersion,
      versionStatus,
      missingRequiredConcepts,
    }
  })
}

function missingConceptFindings(
  evaluations: AgentInstructionContractVersionFinding[],
): AgentInstructionContractConceptFinding[] {
  return evaluations
    .filter(
      (evaluation) =>
        evaluation.versionStatus !== 'missing_contract' &&
        evaluation.missingRequiredConcepts.length > 0,
    )
    .map((evaluation) => ({
      contractId: evaluation.contractId,
      missingConcepts: evaluation.missingRequiredConcepts,
    }))
}

export function evaluateInstructionContent(params: {
  content: string | null | undefined
  agentKey: string
  userId?: string | null
  orgId?: string | null
  sourceKind: AgentInstructionAuditSourceKind
}): AgentInstructionAuditFinding {
  const content = params.content ?? ''
  const contractVersions = content.trim() ? evaluateContracts(content) : []
  const missingContracts = contractVersions
    .filter(
      (evaluation) =>
        evaluation.versionStatus === 'missing_contract' ||
        evaluation.missingRequiredConcepts.length > 0,
    )
    .map((evaluation) => evaluation.contractId)
  const staleContracts = contractVersions
    .filter(
      (evaluation) =>
        evaluation.versionStatus === 'missing_version' ||
        evaluation.versionStatus === 'stale' ||
        evaluation.versionStatus === 'future',
    )
    .map((evaluation) => evaluation.contractId)
  const missingRequiredConcepts = missingConceptFindings(contractVersions)

  if (!content.trim()) {
    return {
      agentKey: params.agentKey,
      userId: params.userId ?? null,
      orgId: params.orgId ?? null,
      sourceKind: params.sourceKind,
      target: 'vibey-api',
      status: 'missing_skill',
      missingContracts: AGENT_INSTRUCTION_CONTRACTS.map((contract) => contract.id),
      staleContracts: [],
      missingRequiredConcepts: AGENT_INSTRUCTION_CONTRACTS.map((contract) => ({
        contractId: contract.id,
        missingConcepts: contract.requiredConcepts,
      })),
      contractVersions: AGENT_INSTRUCTION_CONTRACTS.map((contract) => ({
        contractId: contract.id,
        title: contract.title,
        expectedVersion: contract.version,
        renderedVersion: null,
        versionStatus: 'missing_contract',
        missingRequiredConcepts: contract.requiredConcepts,
      })),
      missingActions: [...AUDIT_GENERATED_ACTIONS].sort(),
      message: 'vibey-api skill content is missing.',
    }
  }

  const status: AgentInstructionAuditStatus =
    missingContracts.length > 0
      ? 'missing_contracts'
      : staleContracts.length > 0
        ? 'stale_contracts'
        : 'ok'

  return {
    agentKey: params.agentKey,
    userId: params.userId ?? null,
    orgId: params.orgId ?? null,
    sourceKind: params.sourceKind,
    target: 'vibey-api',
    status,
    missingContracts,
    staleContracts,
    missingRequiredConcepts,
    contractVersions,
    missingActions: [],
    message:
      missingContracts.length > 0
        ? `vibey-api is missing ${missingContracts.length} instruction contract(s).`
        : staleContracts.length > 0
          ? `vibey-api has ${staleContracts.length} stale instruction contract(s).`
          : 'vibey-api includes all audited instruction contracts.',
  }
}

export function evaluateToolsContent(params: {
  content: string | null | undefined
  agentKey: string
  userId?: string | null
  orgId?: string | null
  source?: string | null
  sourceKind: 'db_agent_tools'
}): AgentInstructionAuditFinding {
  const content = params.content ?? ''
  const policy = classifyAgentInstructionCustomRow({
    content,
    source: params.source,
    userId: params.userId,
    orgId: params.orgId,
  })

  if (!content.trim()) {
    return {
      agentKey: params.agentKey,
      userId: params.userId ?? null,
      orgId: params.orgId ?? null,
      sourceKind: params.sourceKind,
      target: 'TOOLS.md',
      status: 'missing_skill',
      missingContracts: [],
      staleContracts: [],
      missingRequiredConcepts: [],
      contractVersions: [],
      missingActions: [],
      classification: policy.classification,
      autoRepairAllowed: policy.autoRepairAllowed,
      repairPolicyReason: policy.reason,
      message: 'TOOLS.md content is missing.',
    }
  }

  const ok =
    hasPlatformToolsRuntimeGuidance(content) &&
    content.includes(PLATFORM_TOOLS_NAMED_CLIENT_LOOKUP_HEADING) &&
    content.includes('skills/vibey-api/SKILL.md') &&
    content.includes('skills/{skill-key}/SKILL.md')

  return {
    agentKey: params.agentKey,
    userId: params.userId ?? null,
    orgId: params.orgId ?? null,
    sourceKind: params.sourceKind,
    target: 'TOOLS.md',
    status: ok ? 'ok' : 'missing_contracts',
    missingContracts: [],
    staleContracts: [],
    missingRequiredConcepts: [],
    contractVersions: [],
    missingActions: [],
    classification: policy.classification,
    autoRepairAllowed: policy.autoRepairAllowed,
    repairPolicyReason: policy.reason,
    message: ok
      ? 'TOOLS.md includes platform runtime guidance.'
      : `TOOLS.md is missing ${PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING} guidance.`,
  }
}

@Injectable()
export class AgentInstructionAuditService {
  private readonly supabase: SupabaseClient

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: AgentSyncRepository = new AgentSyncRepository(),
  ) {
    this.supabase = svc.client
  }

  auditGeneratedVibeyApiSkill(): AgentInstructionAuditFinding {
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      AUDIT_GENERATED_ACTIONS,
      'management',
    )
    return evaluateInstructionContent({
      agentKey: 'generated',
      userId: null,
      orgId: null,
      sourceKind: 'generated_vibey_api',
      content: [skillMd, ...Object.values(referenceFiles)].join('\n\n'),
    })
  }

  async auditDbVibeyApiSkills(
    input: AgentInstructionAuditInput = {},
  ): Promise<AgentInstructionAuditFinding[]> {
    const rows = (await this.repository.listVibeyApiSkillAuditRows(
      this.supabase,
      input,
    )) as AgentSkillAuditRow[]
    if (rows.length === 0) {
      return [
        evaluateInstructionContent({
          agentKey: input.agent_key ?? '*',
          userId: input.user_id ?? null,
          orgId: input.org_id ?? null,
          sourceKind: 'db_agent_skill',
          content: null,
        }),
      ]
    }

    return rows.map((row) =>
      evaluateInstructionContent({
        agentKey: row.agent_key,
        userId: row.user_id,
        orgId: row.org_id,
        sourceKind: 'db_agent_skill',
        content: row.is_enabled ? row.markdown_content : '',
      }),
    )
  }

  async auditDbToolsDefinitions(
    input: AgentInstructionAuditInput = {},
  ): Promise<AgentInstructionAuditFinding[]> {
    const rows = (await this.repository.listToolsDefinitionAuditRows(
      this.supabase,
      input,
    )) as AgentDefinitionAuditRow[]
    if (rows.length === 0) {
      return [
        evaluateToolsContent({
          agentKey: input.agent_key ?? '*',
          userId: input.user_id ?? null,
          orgId: input.org_id ?? null,
          source: null,
          sourceKind: 'db_agent_tools',
          content: null,
        }),
      ]
    }

    return rows.map((row) =>
      evaluateToolsContent({
        agentKey: row.agent_key,
        userId: row.user_id,
        orgId: row.org_id,
        source: row.source,
        sourceKind: 'db_agent_tools',
        content: row.content,
      }),
    )
  }

  async audit(input: AgentInstructionAuditInput = {}): Promise<{
    findings: AgentInstructionAuditFinding[]
    summary: Record<AgentInstructionAuditStatus, number>
  }> {
    const findings = [
      this.auditGeneratedVibeyApiSkill(),
      ...(await this.auditDbVibeyApiSkills(input)),
      ...(await this.auditDbToolsDefinitions(input)),
    ]
    const summary = findings.reduce(
      (acc, finding) => {
        acc[finding.status] += 1
        return acc
      },
      { ok: 0, missing_contracts: 0, stale_contracts: 0, missing_skill: 0 },
    )

    return { findings, summary }
  }
}
