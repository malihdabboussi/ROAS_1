import { describe, expect, it, vi } from 'vitest'
import { AgentInstructionRepairService } from './agent-instruction-repair.service'

function makeSupabase(rows: unknown[]) {
  const updates: unknown[] = []
  const selectQuery = {
    select: () => selectQuery,
    eq: () => selectQuery,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  }
  const updateQuery = {
    eq: () => updateQuery,
    in: () => updateQuery,
    is: () => updateQuery,
    then: (resolve: (value: { data: null; error: null }) => void) =>
      resolve({ data: null, error: null }),
  }
  return {
    updates,
    client: {
      from: vi.fn((table: string) => ({
        select: selectQuery.select,
        update: (payload: unknown) => {
          updates.push({ table, payload })
          return updateQuery
        },
      })),
    },
  }
}

const staleFinding = {
  agentKey: 'vibey',
  userId: null,
  orgId: null,
  sourceKind: 'db_agent_skill' as const,
  target: 'vibey-api' as const,
  status: 'missing_contracts' as const,
  missingContracts: ['space-retrieval-protocol' as const],
  staleContracts: [],
  missingRequiredConcepts: [],
  contractVersions: [],
  missingActions: [],
  message: 'stale',
}

describe('AgentInstructionRepairService', () => {
  it('repairs only platform-owned system vibey-api rows', async () => {
    const supabase = makeSupabase([
      {
        id: 'skill-1',
        agent_key: 'vibey',
        user_id: null,
        org_id: null,
        source: 'system',
        is_enabled: true,
      },
    ])
    const service = new AgentInstructionRepairService(
      { client: supabase.client } as any,
      { auditDbVibeyApiSkills: vi.fn(async () => [staleFinding]) } as any,
    )

    const result = await service.repairPlatformVibeyApiSkills({ agent_key: 'vibey' })

    expect(result.repaired).toHaveLength(1)
    expect(result.skipped).toEqual([])
    expect(supabase.updates).toHaveLength(1)
    expect(JSON.stringify(supabase.updates[0])).toContain('Space Retrieval Protocol')
    expect(JSON.stringify(supabase.updates[0])).toContain(
      'references/protocols/space-retrieval-protocol.md',
    )
  })

  it('skips user custom rows', async () => {
    const supabase = makeSupabase([
      {
        id: 'skill-2',
        agent_key: 'vibey',
        user_id: 'user-1',
        org_id: null,
        source: 'custom',
        is_enabled: true,
      },
    ])
    const service = new AgentInstructionRepairService(
      { client: supabase.client } as any,
      {
        auditDbVibeyApiSkills: vi.fn(async () => [{ ...staleFinding, userId: 'user-1' }]),
      } as any,
    )

    const result = await service.repairPlatformVibeyApiSkills({ agent_key: 'vibey' })

    expect(result.repaired).toEqual([])
    expect(result.skipped[0]?.reason).toBe('not_platform_owned_system_row')
    expect(supabase.updates).toEqual([])
  })

  it('repairs platform-owned system and library TOOLS.md rows', async () => {
    const supabase = makeSupabase([
      {
        id: 'def-1',
        agent_key: 'ivy',
        file_name: 'TOOLS.md',
        user_id: null,
        org_id: null,
        source: 'library',
        content: '# TOOLS.md\n\nUse tools.',
      },
    ])
    const service = new AgentInstructionRepairService(
      { client: supabase.client } as any,
      { auditDbVibeyApiSkills: vi.fn(async () => []) } as any,
    )

    const result = await service.repairPlatformToolsDefinitions({ agent_key: 'ivy' })

    expect(result.repaired).toHaveLength(1)
    expect(result.skipped).toEqual([])
    expect(JSON.stringify(supabase.updates[0])).toContain('Runtime Operating Layers')
  })

  it('repairs generated custom placeholder TOOLS.md rows', async () => {
    const supabase = makeSupabase([
      {
        id: 'def-2',
        agent_key: 'ivy',
        file_name: 'TOOLS.md',
        user_id: null,
        org_id: null,
        source: 'custom',
        content: '# TOOLS.md\n\nUse tools.',
      },
    ])
    const service = new AgentInstructionRepairService(
      { client: supabase.client } as any,
      { auditDbVibeyApiSkills: vi.fn(async () => []) } as any,
    )

    const result = await service.repairPlatformToolsDefinitions({ agent_key: 'ivy' })

    expect(result.repaired).toHaveLength(1)
    expect(result.skipped).toEqual([])
    expect(JSON.stringify(supabase.updates[0])).toContain('Runtime Operating Layers')
  })

  it('skips user-authored custom TOOLS.md rows', async () => {
    const supabase = makeSupabase([
      {
        id: 'def-3',
        agent_key: 'ivy',
        file_name: 'TOOLS.md',
        user_id: 'user-1',
        org_id: null,
        source: 'custom',
        content: '# TOOLS.md\n\nUse my private tool checklist.',
      },
    ])
    const service = new AgentInstructionRepairService(
      { client: supabase.client } as any,
      { auditDbVibeyApiSkills: vi.fn(async () => []) } as any,
    )

    const result = await service.repairPlatformToolsDefinitions({ agent_key: 'ivy' })

    expect(result.repaired).toEqual([])
    expect(result.skipped[0]?.reason).toBe('user_custom_rows_are_preserved')
    expect(supabase.updates).toEqual([])
  })
})
