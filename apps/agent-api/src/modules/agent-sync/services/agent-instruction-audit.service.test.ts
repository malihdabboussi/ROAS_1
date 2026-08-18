import { describe, expect, it } from 'vitest'
import {
  AGENT_INSTRUCTION_CONTRACTS,
  findAgentInstructionContract,
  renderAgentInstructionContract,
} from '../contracts/agent-instruction-contracts'
import {
  AgentInstructionAuditService,
  evaluateInstructionContent,
  evaluateToolsContent,
} from './agent-instruction-audit.service'

function makeSupabaseRows(rows: unknown[]) {
  const query = {
    select: () => query,
    eq: () => query,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  }
  return {
    from: () => query,
  }
}

function renderAllContractsWith(contractId: string, replacement: string): string {
  return AGENT_INSTRUCTION_CONTRACTS.map((contract) =>
    contract.id === contractId ? replacement : renderAgentInstructionContract(contract),
  ).join('\n\n')
}

describe('AgentInstructionAuditService', () => {
  it('reports missing contracts for stale content', () => {
    const finding = evaluateInstructionContent({
      content: '# Vibey API\n\nOld docs only.',
      agentKey: 'vibey',
      sourceKind: 'db_agent_skill',
    })

    expect(finding.status).toBe('missing_contracts')
    expect(finding.target).toBe('vibey-api')
    expect(finding.missingContracts).toContain('space-retrieval-protocol')
    expect(finding.missingContracts).toContain('brain-knowledge-protocol')
    expect(finding.contractVersions[0]?.versionStatus).toBe('missing_contract')
  })

  it('reports stale contracts when protocol version is missing', () => {
    const contract = findAgentInstructionContract('space-retrieval-protocol')
    const renderedWithoutVersion = renderAgentInstructionContract(contract).replace(
      'Protocol version: 1\n\n',
      '',
    )
    const finding = evaluateInstructionContent({
      content: renderAllContractsWith('space-retrieval-protocol', renderedWithoutVersion),
      agentKey: 'vibey',
      sourceKind: 'db_agent_skill',
    })

    expect(finding.status).toBe('stale_contracts')
    expect(finding.staleContracts).toContain('space-retrieval-protocol')
    expect(
      finding.contractVersions.find((item) => item.contractId === 'space-retrieval-protocol')
        ?.versionStatus,
    ).toBe('missing_version')
  })

  it('reports stale contracts when protocol version is behind', () => {
    const contract = findAgentInstructionContract('space-retrieval-protocol')
    const renderedWithStaleVersion = renderAgentInstructionContract({
      ...contract,
      version: 0,
    })
    const finding = evaluateInstructionContent({
      content: renderAllContractsWith('space-retrieval-protocol', renderedWithStaleVersion),
      agentKey: 'vibey',
      sourceKind: 'db_agent_skill',
    })

    expect(finding.status).toBe('stale_contracts')
    expect(finding.staleContracts).toEqual(['space-retrieval-protocol'])
  })

  it('reports missing concepts without hiding the exact missing text', () => {
    const contract = findAgentInstructionContract('space-retrieval-protocol')
    const renderedWithoutConcept = renderAgentInstructionContract(contract)
      .split('semantic Space retrieval')
      .join('semantic retrieval')
    const finding = evaluateInstructionContent({
      content: renderAllContractsWith('space-retrieval-protocol', renderedWithoutConcept),
      agentKey: 'vibey',
      sourceKind: 'db_agent_skill',
    })

    expect(finding.status).toBe('missing_contracts')
    expect(finding.missingContracts).toContain('space-retrieval-protocol')
    expect(finding.missingRequiredConcepts).toEqual([
      {
        contractId: 'space-retrieval-protocol',
        missingConcepts: ['semantic Space retrieval'],
      },
    ])
  })

  it('accepts compact protocol index rows when full protocol references live outside SKILL.md', () => {
    const finding = evaluateInstructionContent({
      content:
        '# Vibey API\n\n| Protocol | Version | Reference | Use when |\n|---------|---------|-----------|----------|\n| Space Retrieval Protocol | v1 | `references/protocols/space-retrieval-protocol.md` | Use for active Space retrieval. |\n| Planning Protocol | v1 | `references/protocols/planning-protocol.md` | Use for multi-step platform work. |',
      agentKey: 'vibey',
      sourceKind: 'db_agent_skill',
    })

    expect(
      finding.contractVersions.find((item) => item.contractId === 'space-retrieval-protocol'),
    ).toMatchObject({
      renderedVersion: 1,
      versionStatus: 'current',
    })
    expect(
      finding.contractVersions.find((item) => item.contractId === 'planning-protocol'),
    ).toMatchObject({
      renderedVersion: 1,
      versionStatus: 'current',
    })
  })

  it('reports missing skill when content is empty', () => {
    const finding = evaluateInstructionContent({
      content: '',
      agentKey: 'vibey',
      sourceKind: 'db_agent_skill',
    })

    expect(finding.status).toBe('missing_skill')
    expect(finding.missingContracts.length).toBeGreaterThan(0)
    expect(finding.contractVersions.length).toBeGreaterThan(0)
    expect(finding.missingActions).toContain('search_space_context')
  })

  it('passes generated vibey-api output with audited actions', () => {
    const service = new AgentInstructionAuditService({
      client: makeSupabaseRows([]),
    } as any)

    const finding = service.auditGeneratedVibeyApiSkill()

    expect(finding.status).toBe('ok')
    expect(finding.missingContracts).toEqual([])
    expect(finding.staleContracts).toEqual([])
  })

  it('audits db-backed vibey-api rows without writing', async () => {
    const service = new AgentInstructionAuditService({
      client: makeSupabaseRows([
        {
          id: 'skill-1',
          user_id: null,
          org_id: null,
          agent_key: 'vibey',
          skill_key: 'vibey-api',
          markdown_content: '# Vibey API\n\nOld docs only.',
          is_enabled: true,
        },
      ]),
    } as any)

    const result = await service.auditDbVibeyApiSkills({ agent_key: 'vibey' })

    expect(result).toHaveLength(1)
    expect(result[0]?.agentKey).toBe('vibey')
    expect(result[0]?.status).toBe('missing_contracts')
  })

  it('audits TOOLS.md runtime guidance', () => {
    const stale = evaluateToolsContent({
      content: '# TOOLS.md\n\nUse tools.',
      agentKey: 'vibey',
      sourceKind: 'db_agent_tools',
    })
    const current = evaluateToolsContent({
      content:
        '# TOOLS.md\n\n## Runtime Operating Layers\n\nFor a named or misspelled client:\n\nUse `skills/vibey-api/SKILL.md` and `skills/{skill-key}/SKILL.md`.',
      agentKey: 'vibey',
      sourceKind: 'db_agent_tools',
    })

    const runtimeOnly = evaluateToolsContent({
      content:
        '# TOOLS.md\n\n## Runtime Operating Layers\n\nUse `skills/vibey-api/SKILL.md` and `skills/{skill-key}/SKILL.md`.',
      agentKey: 'vibey',
      sourceKind: 'db_agent_tools',
    })

    expect(stale.status).toBe('missing_contracts')
    expect(stale.target).toBe('TOOLS.md')
    expect(stale.classification).toBe('generated_placeholder')
    expect(stale.autoRepairAllowed).toBe(true)
    expect(runtimeOnly.status).toBe('missing_contracts')
    expect(current.status).toBe('ok')
    expect(current.classification).toBe('platform_template_copy')
  })
})
