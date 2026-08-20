import { describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyTeamBrainService } from './artifact-legacy-team-brain.service'

type QueryRecord = {
  table: string
  filters: Record<string, unknown>
  isFilters: Record<string, unknown>
  inFilters: Record<string, unknown[]>
  orFilter: string | null
  operation: 'insert' | 'update' | 'upsert' | 'delete' | null
  payload: unknown
  selectColumns: string | undefined
  orders: Array<{ column: string; options?: Record<string, unknown> }>
  limitValue: number | undefined
}

function makeQueryClient(
  handler: (
    record: QueryRecord,
    terminal: 'maybeSingle' | 'single' | 'then',
  ) => Promise<{ data: unknown; error: unknown }> | { data: unknown; error: unknown },
) {
  const records: QueryRecord[] = []
  const client = {
    from: vi.fn((table: string) => {
      const record: QueryRecord = {
        table,
        filters: {},
        isFilters: {},
        inFilters: {},
        orFilter: null,
        operation: null,
        payload: null,
        selectColumns: undefined,
        orders: [],
        limitValue: undefined,
      }
      records.push(record)
      const query: any = {
        select: vi.fn((columns?: string) => {
          record.selectColumns = columns
          return query
        }),
        eq: vi.fn((key: string, value: unknown) => {
          record.filters[key] = value
          return query
        }),
        neq: vi.fn((key: string, value: unknown) => {
          record.filters[`neq:${key}`] = value
          return query
        }),
        is: vi.fn((key: string, value: unknown) => {
          record.isFilters[key] = value
          return query
        }),
        in: vi.fn((key: string, value: unknown[]) => {
          record.inFilters[key] = value
          return query
        }),
        or: vi.fn((filter: string) => {
          record.orFilter = filter
          return query
        }),
        order: vi.fn((column: string, options?: Record<string, unknown>) => {
          record.orders.push({ column, options })
          return query
        }),
        limit: vi.fn((value: number) => {
          record.limitValue = value
          return query
        }),
        insert: vi.fn((payload: unknown) => {
          record.operation = 'insert'
          record.payload = payload
          return query
        }),
        update: vi.fn((payload: unknown) => {
          record.operation = 'update'
          record.payload = payload
          return query
        }),
        upsert: vi.fn((payload: unknown) => {
          record.operation = 'upsert'
          record.payload = payload
          return query
        }),
        delete: vi.fn(() => {
          record.operation = 'delete'
          return query
        }),
        maybeSingle: vi.fn(() => handler(record, 'maybeSingle')),
        single: vi.fn(() => handler(record, 'single')),
        then: (
          resolve: (value: { data: unknown; error: unknown }) => unknown,
          reject?: (reason?: unknown) => unknown,
        ) => Promise.resolve(handler(record, 'then')).then(resolve, reject),
      }
      return query
    }),
    rpc: vi.fn(async (name: string, params: Record<string, unknown>) => {
      if (name === 'find_similar_snapshots') {
        return {
          data: [{ id: 'snapshot-1', similarity: 0.82 }],
          error: null,
          params,
        }
      }
      return { data: null, error: null }
    }),
  }
  return { client, records }
}

function makeTarget(client: unknown, serviceClient: unknown = client) {
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => null),
    resolveCampaignId: vi.fn(async () => 'campaign-1'),
    getUserClient: vi.fn(async () => client),
    serviceClient,
    embeddingService: {
      getEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
      computeContentHash: vi.fn(() => 'hash-1'),
    },
    memoriesRepo: {
      search: vi.fn(async () => [
        {
          content: 'Remember to send onboarding notes.',
          memory_type: 'fact',
          significance: 0.7,
          similarity: 0.91,
        },
      ]),
      checkDuplicate: vi.fn(async () => false),
      create: vi.fn(async (_client: unknown, record: Record<string, unknown>) => ({
        id: 'memory-1',
        ...record,
      })),
    },
    emotionalTagging: {
      tagMemory: vi.fn(async () => {}),
    },
    parseAgentIdFromSessionKey: vi.fn(() => 'copywriter'),
    parseConversationId: vi.fn(() => 'conversation-1'),
    logger: { error: vi.fn() },
  }
}

describe('ArtifactLegacyTeamBrainService', () => {
  it('hydrates HR agent profile with definitions and enabled skills', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'agents_registry') {
        return {
          data: {
            agent_key: 'copywriter',
            name: 'Copy Writer',
            role: 'Copywriter',
            level: 'employee',
            specialty: 'Email',
            status: 'active',
            skills: ['writing'],
            config: { capability_domain: 'marketing' },
          },
          error: null,
        }
      }
      if (record.table === 'agent_definitions') {
        return {
          data: [
            {
              file_name: 'SOUL.md',
              content: 'DISC Profile: D/I (Driver)\n## Values\n1. **Clarity**',
            },
            { file_name: 'ROLE.md', content: '## Purpose\nWrite customer-facing copy.\n## Next' },
            {
              file_name: 'IDENTITY.md',
              content: '**Tagline:** Words that sell\n**Tone:** Direct\n**Humor:** Dry',
            },
          ],
          error: null,
        }
      }
      if (record.table === 'agent_skills') {
        return {
          data: [
            { skill_key: 'copy', name: 'Copy', description: 'Write copy' },
            { skill_key: 'vibey-api', name: 'API', description: 'Internal' },
          ],
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const service = new ArtifactLegacyTeamBrainService()

    const result = (await service.hrGetAgent(
      makeTarget(client),
      { agent_key: 'Copywriter!' },
      'session-key',
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: true,
      agent: {
        agent_key: 'copywriter',
        disc_profile: 'D/I (Driver)',
        purpose: 'Write customer-facing copy.',
        tagline: 'Words that sell',
        communication_style: { tone: 'Direct', humor: 'Dry' },
        values: ['Clarity'],
        skills: [{ skill_key: 'copy', name: 'Copy', description: 'Write copy' }],
      },
    })
    expect(records.find((record) => record.table === 'agents_registry')).toMatchObject({
      filters: { agent_key: 'copywriter_', user_id: 'user-1' },
      isFilters: { org_id: null },
    })
    expect(records.find((record) => record.table === 'agent_skills')).toMatchObject({
      filters: { agent_key: 'copywriter_', is_enabled: true },
      orFilter: 'user_id.eq.user-1,user_id.is.null',
      isFilters: { org_id: null },
    })
  })

  it('audits and summarizes team skill coverage without internal skills', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'agents_registry') {
        return {
          data: [
            {
              agent_key: 'copywriter',
              name: 'Copy Writer',
              role: 'Copywriter',
              level: 'employee',
              specialty: 'Email',
              status: 'active',
              config: { capability_domain: 'marketing' },
            },
            {
              agent_key: 'analyst',
              name: 'Analyst',
              role: 'Data analyst',
              level: 'employee',
              specialty: null,
              status: 'active',
              config: { capability_domain: 'analyst' },
            },
          ],
          error: null,
        }
      }
      if (record.table === 'agent_skills' && record.filters.agent_key === 'copywriter') {
        return {
          data: [
            { skill_key: 'copy', name: 'Copy', description: 'Write copy'.repeat(30) },
            { skill_key: 'vibey-api', name: 'API', description: 'Internal' },
          ],
          error: null,
        }
      }
      if (record.table === 'agent_skills' && record.filters.agent_key === 'analyst') {
        return { data: [], error: null }
      }
      return { data: null, error: null }
    })
    const service = new ArtifactLegacyTeamBrainService()
    const target = makeTarget(client)

    const audit = (await service.auditTeamAgentsAndSkills(target, {}, 'session-key')) as Record<
      string,
      any
    >
    const coverage = (await service.compareTeamSkillCoverage(target, {}, 'session-key')) as Record<
      string,
      any
    >
    const summary = (await service.summarizeAgentCapabilities(
      target,
      { agent_key: 'Copywriter!' },
      'session-key',
    )) as Record<string, any>

    expect(audit).toMatchObject({
      success: true,
      totals: {
        agent_count: 2,
        skill_count: 1,
        agents_without_skills: ['analyst'],
      },
      gaps: [
        {
          agent_key: 'analyst',
          issue: 'no_enabled_skills',
          note: 'Data analyst has no enabled workflow skills.',
        },
      ],
    })
    expect(audit.agents[0]).toMatchObject({
      agent_key: 'copywriter',
      domain: 'marketing',
      skill_count: 1,
      skills: [{ skill_key: 'copy', name: 'Copy' }],
    })
    expect(audit.agents[0].skills[0].description).toHaveLength(180)
    expect(coverage.coverage_by_domain).toEqual([
      {
        domain: 'marketing',
        agent_count: 1,
        skill_count: 1,
        agents_without_skills: [],
        common_skill_keys: ['copy'],
      },
      {
        domain: 'analyst',
        agent_count: 1,
        skill_count: 0,
        agents_without_skills: ['analyst'],
        common_skill_keys: [],
      },
    ])
    expect(summary).toMatchObject({
      success: true,
      agents: [
        {
          agent_key: 'copywriter',
          capability_summary: 'Copy',
        },
      ],
    })
    expect(records.filter((record) => record.table === 'agent_skills')).toHaveLength(6)
  })

  it('lists campaign team assignments with registry role metadata', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'campaign_agents') {
        return {
          data: [
            {
              agent_key: 'copywriter',
              name: 'Copy Writer',
              status: 'idle',
              created_at: '2026-06-19T00:00:00.000Z',
              updated_at: '2026-06-19T00:00:00.000Z',
            },
          ],
          error: null,
        }
      }
      if (record.table === 'agents_registry') {
        return {
          data: [{ agent_key: 'copywriter', role: 'Copywriter', level: 'employee' }],
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const service = new ArtifactLegacyTeamBrainService()

    const result = (await service.listCampaignTeam(
      makeTarget(client),
      {},
      'session-key',
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: true,
      campaign_id: 'campaign-1',
      team: [
        {
          agent_key: 'copywriter',
          name: 'Copy Writer',
          status: 'idle',
          role: 'Copywriter',
          level: 'employee',
        },
      ],
    })
    expect(records.find((record) => record.table === 'campaign_agents')).toMatchObject({
      filters: { user_id: 'user-1', campaign_id: 'campaign-1' },
      orders: [{ column: 'created_at', options: { ascending: true } }],
    })
    expect(records.find((record) => record.table === 'agents_registry')).toMatchObject({
      filters: { user_id: 'user-1' },
      inFilters: { agent_key: ['copywriter'] },
      isFilters: { org_id: null },
    })
  })

  it('assigns an existing agent to the active campaign', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'agents_registry') {
        return { data: { agent_key: 'designer', name: 'Designer' }, error: null }
      }
      if (record.table === 'campaign_agents') {
        return {
          data: { campaign_id: 'campaign-1', agent_key: 'designer', name: 'Designer' },
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const service = new ArtifactLegacyTeamBrainService()

    const result = await service.assignAgentToCampaign(
      makeTarget(client),
      { agent_key: 'Designer!' },
      'session-key',
    )

    expect(result).toEqual({
      success: true,
      assignment: { campaign_id: 'campaign-1', agent_key: 'designer', name: 'Designer' },
    })
    expect(records.find((record) => record.table === 'agents_registry')).toMatchObject({
      filters: { agent_key: 'designer_', user_id: 'user-1' },
      isFilters: { org_id: null },
    })
    expect(records.find((record) => record.table === 'campaign_agents')).toMatchObject({
      operation: 'upsert',
      payload: expect.objectContaining({
        campaign_id: 'campaign-1',
        agent_key: 'designer_',
        name: 'Designer',
        status: 'idle',
      }),
    })
  })

  it('merges memory search results with fallback snapshot matches', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'ns_brains' && record.operation === null) {
        return { data: [{ id: 'brain-1' }], error: null }
      }
      if (record.table === 'ns_snapshots') {
        return {
          data: [
            {
              id: 'snapshot-1',
              name: 'ICP',
              core: 'Best customers are founder-led teams.',
              type: 'insight',
              confidence: 0.9,
              significance_score: 0.8,
              tags: ['customer'],
            },
          ],
          error: null,
        }
      }
      return { data: null, error: null }
    })
    const target = makeTarget(client)
    const service = new ArtifactLegacyTeamBrainService()

    const result = (await service.searchMemory(
      target,
      { query: 'customer onboarding', limit: 10 },
      'session-key',
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: true,
      query: 'customer onboarding',
      brain_id: 'brain-1',
      count: 2,
      results: [
        expect.objectContaining({
          source: 'memory',
          content: 'Remember to send onboarding notes.',
          similarity: 0.91,
        }),
        expect.objectContaining({
          source: 'snapshot',
          content: 'ICP: Best customers are founder-led teams.',
          similarity: 0.82,
        }),
      ],
    })
    expect(target.embeddingService.getEmbedding).toHaveBeenCalledWith('customer onboarding', {
      billing: { userId: 'user-1', orgId: null },
    })
    expect((client as any).rpc).toHaveBeenCalledWith(
      'find_similar_snapshots',
      expect.objectContaining({ p_brain_id: 'brain-1', p_limit: 10 }),
    )
    expect(records.find((record) => record.table === 'ns_brains')).toMatchObject({
      filters: { owner_id: 'user-1', is_default: true, scope: 'user' },
      isFilters: { org_id: null },
      limitValue: 1,
    })
  })

  it('saves a user memory with embedding, source title, and emotional tagging', async () => {
    const { client, records } = makeQueryClient((record) => {
      if (record.table === 'conversations') {
        return { data: { title: 'Kickoff call' }, error: null }
      }
      return { data: null, error: null }
    })
    const target = makeTarget(client)
    const service = new ArtifactLegacyTeamBrainService()

    const result = await service.saveMemory(
      target,
      {
        content: 'Remember that this customer prefers concise onboarding notes.',
        memory_type: 'preference',
        tags: ['onboarding'],
      },
      'session-key',
    )

    expect(result).toEqual({ success: true, memory_id: 'memory-1' })
    expect(target.memoriesRepo.checkDuplicate).toHaveBeenCalledWith(
      client,
      'hash-1',
      'user-1',
      undefined,
    )
    expect(target.memoriesRepo.create).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        content: 'Remember that this customer prefers concise onboarding notes.',
        content_hash: 'hash-1',
        memory_type: 'preference',
        source_id: 'conversation-1',
        source_title: 'Kickoff call',
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
      }),
    )
    expect(target.emotionalTagging.tagMemory).toHaveBeenCalledWith(
      client,
      'memory-1',
      'Remember that this customer prefers concise onboarding notes.',
      'user-1',
      null,
    )
    expect(records.find((record) => record.table === 'conversations')).toMatchObject({
      filters: { id: 'conversation-1' },
    })
  })

  it('saves a person-period fork memory into the TARGET person brain, not the default user brain', async () => {
    // Prod bug: 400 fork jobs "succeeded" while every save landed in the org
    // owner's default user brain — record.brain_id was only set for customer
    // targets, and dedup checked the default brain.
    const { client } = makeQueryClient(() => ({ data: null, error: null }))
    const target = makeTarget(client)
    const service = new ArtifactLegacyTeamBrainService()
    const sessionKey = 'agent:atlas:atlas-user-1-brain-job-42::brain:user:person-brain-nefi'

    const result = await service.saveMemory(
      target,
      {
        content: 'Nefi runs the Yasir webinar follow-up sequence every Monday.',
        memory_type: 'fact',
        source_type: 'slack_period',
      },
      sessionKey,
    )

    expect(result).toEqual({ success: true, memory_id: 'memory-1' })
    expect(target.memoriesRepo.checkDuplicate).toHaveBeenCalledWith(
      client,
      'hash-1',
      'user-1',
      'person-brain-nefi',
    )
    expect(target.memoriesRepo.create).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ brain_id: 'person-brain-nefi', source_type: 'slack_period' }),
    )
  })

  it('honors an explicit brain_id input outside brain jobs', async () => {
    const { client } = makeQueryClient(() => ({ data: null, error: null }))
    const target = makeTarget(client)
    const service = new ArtifactLegacyTeamBrainService()

    await service.saveMemory(
      target,
      {
        content: 'Explicit person brain note that is long enough to store.',
        memory_type: 'fact',
        brain_id: 'person-brain-explicit',
      },
      'session-key',
    )
    expect(target.memoriesRepo.create).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ brain_id: 'person-brain-explicit' }),
    )
  })

  it('classifies credit-aware errors for user-facing artifact failures', () => {
    const service = new ArtifactLegacyTeamBrainService()

    expect(service.resolveCreditAwareError({ status: 402 })).toBe('credits_exhausted')
    expect(service.resolveCreditAwareError({ message: 'Insufficient credits for request' })).toBe(
      'credits_exhausted',
    )
    expect(service.resolveCreditAwareError({ message: 'Different failure' })).toBeNull()
  })
})
