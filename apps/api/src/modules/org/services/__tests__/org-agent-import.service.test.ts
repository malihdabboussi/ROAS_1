import { describe, expect, it, vi } from 'vitest'
import { OrgAgentImportService } from '../org-agent-import.service'

type QueryResult = { data?: unknown; error?: { message: string } | null }

function makeQuery(table: string, result: QueryResult, inserts: Record<string, unknown[]>) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    insert: vi.fn((payload: unknown) => {
      inserts[table] = inserts[table] ?? []
      inserts[table].push(payload)
      return query
    }),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function makeSupabase() {
  const inserts: Record<string, unknown[]> = {}
  const queues: Record<string, QueryResult[]> = {
    agents_registry: [
      {
        data: {
          id: 'agent-source',
          created_at: 'old-created',
          updated_at: 'old-updated',
          user_id: 'user-1',
          org_id: null,
          agent_key: 'copywriter',
          name: 'Copywriter',
          role: 'Writer',
        },
        error: null,
      },
      { data: null, error: null },
      { data: { id: 'agent-new' }, error: null },
    ],
    agent_skills: [
      {
        data: [{ id: 'skill-1', created_at: 'old', updated_at: 'old', user_id: 'user-1', agent_key: 'copywriter', org_id: null, name: 'Draft' }],
        error: null,
      },
      { error: null },
    ],
    agent_skill_resources: [
      {
        data: [{ id: 'resource-1', created_at: 'old', updated_at: 'old', user_id: 'user-1', agent_key: 'copywriter', org_id: null, url: 'https://example.com' }],
        error: null,
      },
      { error: null },
    ],
    agent_definitions: [
      {
        data: [{ id: 'definition-1', created_at: 'old', updated_at: 'old', user_id: 'user-1', agent_key: 'copywriter', org_id: null, content: 'definition' }],
        error: null,
      },
      { error: null },
    ],
    ns_brains: [
      {
        data: {
          id: 'brain-source',
          created_at: 'old',
          updated_at: 'old',
          pending_deletion_at: null,
          owner_id: 'user-1',
          org_id: null,
          agent_id: 'copywriter',
          name: 'Copywriter Brain',
        },
        error: null,
      },
      { data: { id: 'brain-new' }, error: null },
    ],
    ns_memories: [
      { data: [{ id: 'memory-1', created_at: 'old', updated_at: 'old', brain_id: 'brain-source', content: 'memory' }], error: null },
      { error: null },
    ],
    ns_sk_entries: [
      { data: [{ id: 'sk-1', created_at: 'old', updated_at: 'old', source_id: 'source-1', brain_id: 'brain-source', content: 'sk' }], error: null },
      { error: null },
    ],
    ns_snapshots: [
      { data: [{ id: 'snapshot-1', created_at: 'old', updated_at: 'old', brain_id: 'brain-source', content: 'snapshot' }], error: null },
      { error: null },
    ],
  }
  const client = {
    from: vi.fn((table: string) => {
      const result = queues[table]?.shift()
      if (!result) throw new Error(`Unexpected table query: ${table}`)
      return makeQuery(table, result, inserts)
    }),
  }
  return { client, inserts }
}

describe('OrgAgentImportService.importAgents', () => {
  it('copies personal agent rows and optional brain assets into the org', async () => {
    const supabase = makeSupabase()
    const service = new OrgAgentImportService({ client: supabase.client } as never)

    await expect(
      service.importAgents('org-1', 'user-1', ['copywriter'], true),
    ).resolves.toEqual([
      {
        agentKey: 'copywriter',
        agentId: 'agent-new',
        skillsImported: 1,
        skillResourcesImported: 1,
        definitionsImported: 1,
        brainImported: true,
        brainId: 'brain-new',
      },
    ])

    expect(supabase.inserts.agents_registry[0]).toMatchObject({
      org_id: 'org-1',
      user_id: null,
      created_by: 'user-1',
      agent_key: 'copywriter',
      name: 'Copywriter',
    })
    expect(supabase.inserts.agent_skills[0]).toEqual([
      expect.objectContaining({ org_id: 'org-1', user_id: null, name: 'Draft' }),
    ])
    expect(supabase.inserts.ns_memories[0]).toEqual([
      expect.objectContaining({ brain_id: 'brain-new', content: 'memory' }),
    ])
    expect(supabase.inserts.ns_sk_entries[0]).toEqual([
      expect.objectContaining({ brain_id: 'brain-new', source_id: null, content: 'sk' }),
    ])
    expect(supabase.inserts.ns_snapshots[0]).toEqual([
      expect.objectContaining({ brain_id: 'brain-new', content: 'snapshot' }),
    ])
  })
})
