import { describe, expect, it, vi } from 'vitest'
import { ArtifactBrainScholarService } from './artifact-brain-scholar.service'

function makeTarget() {
  const brainRows: Record<string, string> = {
    client_success: 'brain-client-success',
    mastermind_coach: 'brain-mastermind-coach',
  }

  const serviceClient = {
    from: vi.fn((table: string) => {
      const filters = new Map<string, unknown>()
      const builder: Record<string, unknown> = {
        select: vi.fn(() => builder),
        eq: vi.fn((key: string, value: unknown) => {
          filters.set(key, value)
          return builder
        }),
        is: vi.fn(() => builder),
        limit: vi.fn(async () => ({ data: [{ domain: 'sales' }], error: null })),
        maybeSingle: vi.fn(async () => {
          if (table !== 'ns_brains') return { data: null, error: null }
          const agentId = String(filters.get('agent_id') ?? '')
          const id = brainRows[agentId]
          return { data: id ? { id } : null, error: null }
        }),
      }
      return builder
    }),
  }

  return {
    config: { agentKey: 'client_success' },
    serviceClient,
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => 'org-1'),
    parseAgentIdFromSessionKey: vi.fn(() => 'client_success'),
    getUserClient: vi.fn(async () => ({})),
    brainRetrievalService: {
      search: vi.fn(async () => ({ success: true, results: [] })),
    },
    executeAction: vi.fn(async (action: string, data: Record<string, unknown>) => ({
      success: true,
      action,
      data,
    })),
  }
}

type Db = Record<string, Array<Record<string, any>>>

class DbQueryBuilder {
  private filters: Array<{ key: string; value: unknown; mode: 'eq' | 'is' | 'in' }> = []
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private payload: any
  private maxRows: number | null = null
  private rangeStart: number | null = null
  private rangeEnd: number | null = null
  private countRequested = false
  private headOnly = false
  private selectedColumns: string[] | null = null

  constructor(
    private readonly db: Db,
    private readonly table: string,
  ) {}

  select(columns?: string, options?: { count?: string; head?: boolean }) {
    this.countRequested = options?.count === 'exact'
    this.headOnly = options?.head === true
    this.selectedColumns =
      columns && columns.trim() !== '*'
        ? columns
            .split(',')
            .map((column) => column.trim())
            .filter(Boolean)
        : null
    return this
  }

  eq(key: string, value: unknown) {
    this.filters.push({ key, value, mode: 'eq' })
    return this
  }

  is(key: string, value: unknown) {
    this.filters.push({ key, value, mode: 'is' })
    return this
  }

  in(key: string, value: unknown[]) {
    this.filters.push({ key, value, mode: 'in' })
    return this
  }

  or() {
    return this
  }

  order() {
    return this
  }

  limit(limit: number) {
    this.maxRows = limit
    return this
  }

  range(start: number, end: number) {
    this.rangeStart = start
    this.rangeEnd = end
    return this
  }

  insert(payload: any) {
    this.op = 'insert'
    this.payload = payload
    return this
  }

  update(payload: any) {
    this.op = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.op = 'delete'
    return this
  }

  upsert(payload: any) {
    this.op = 'upsert'
    this.payload = payload
    return this
  }

  async maybeSingle() {
    const result = await this.execute()
    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
    return { data: rows[0] ?? null, error: null }
  }

  async single() {
    const result = await this.execute()
    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
    return { data: rows[0] ?? null, error: null }
  }

  then(resolve: (value: any) => void, reject: (reason?: any) => void) {
    return this.execute().then(resolve, reject)
  }

  private rows() {
    return this.db[this.table] ?? []
  }

  private matches(row: Record<string, any>) {
    return this.filters.every((filter) => {
      const value = row[filter.key]
      if (filter.mode === 'is') {
        return value === filter.value || (filter.value === null && value === undefined)
      }
      if (filter.mode === 'in') {
        return Array.isArray(filter.value) && filter.value.map(String).includes(String(value))
      }
      return String(value ?? '') === String(filter.value ?? '')
    })
  }

  private async execute() {
    if (!this.db[this.table]) this.db[this.table] = []
    if (this.op === 'insert' || this.op === 'upsert') {
      const row = {
        id: this.payload.id ?? `${this.table}-${this.rows().length + 1}`,
        created_at: this.payload.created_at ?? new Date(0).toISOString(),
        updated_at: this.payload.updated_at ?? new Date(0).toISOString(),
        ...this.payload,
      }
      this.db[this.table].push(row)
      return { data: [row], error: null }
    }
    if (this.op === 'update') {
      const updated: Record<string, any>[] = []
      for (const row of this.rows()) {
        if (this.matches(row)) {
          Object.assign(row, this.payload)
          updated.push(row)
        }
      }
      return { data: updated, error: null }
    }
    if (this.op === 'delete') {
      const before = this.rows()
      this.db[this.table] = before.filter((row) => !this.matches(row))
      return { data: [], error: null }
    }
    const rows = this.rows().filter((row) => this.matches(row))
    const ranged =
      this.rangeStart !== null && this.rangeEnd !== null
        ? rows.slice(this.rangeStart, this.rangeEnd + 1)
        : this.maxRows
          ? rows.slice(0, this.maxRows)
          : rows
    const projected = this.selectedColumns
      ? ranged.map((row) =>
          Object.fromEntries(
            this.selectedColumns!
              .filter((column) => Object.prototype.hasOwnProperty.call(row, column))
              .map((column) => [column, row[column]]),
          ),
        )
      : ranged
    const data = this.headOnly ? null : projected
    return { data, error: null, count: this.countRequested ? rows.length : null }
  }
}

function makeDbTarget(db: Db) {
  const serviceClient = {
    from: vi.fn((table: string) => new DbQueryBuilder(db, table)),
    rpc: vi.fn(async () => ({ data: [{ id: 'sk-match' }], error: null })),
  }
  const userClient = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
  }
  return {
    config: { agentKey: 'atlas' },
    serviceClient,
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => 'org-1'),
    parseAgentIdFromSessionKey: vi.fn(() => 'atlas'),
    getUserClient: vi.fn(async () => userClient),
    embeddingService: {
      getEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
    },
  }
}

describe('ArtifactBrainScholarService agent brain access', () => {
  it('blocks regular agents from searching another agent brain by brain_id', async () => {
    const target = makeTarget()
    const handlers = new ArtifactBrainScholarService().getHandlers(target)

    const result = await handlers.search_agent_brain(
      { query: 'pricing', brain_id: 'brain-mastermind-coach' },
      'agent:client_success:stub',
    )

    expect(result).toMatchObject({
      success: false,
      error: 'Agent Brain access is limited to the calling agent.',
    })
    expect(target.brainRetrievalService.search).not.toHaveBeenCalled()
  })

  it('allows regular agents to search their own agent brain by brain_id', async () => {
    const target = makeTarget()
    const handlers = new ArtifactBrainScholarService().getHandlers(target)

    const result = await handlers.search_agent_brain(
      { query: 'pricing', brain_id: 'brain-client-success' },
      'agent:client_success:stub',
    )

    expect(result).toMatchObject({ success: true })
    expect(target.brainRetrievalService.search).toHaveBeenCalledWith(
      expect.objectContaining({
        family: 'agent',
        brainId: 'brain-client-success',
      }),
    )
  })

  it('blocks regular agents from resolving another agent brain by agent_key', async () => {
    const target = makeTarget()
    const handlers = new ArtifactBrainScholarService().getHandlers(target)

    const result = await handlers.resolve_agent_brain(
      { agent_key: 'mastermind_coach' },
      'agent:client_success:stub',
    )

    expect(result).toMatchObject({
      success: false,
      error: 'Agent Brain access is limited to the calling agent.',
    })
  })

  it('allows Atlas to resolve another agent brain', async () => {
    const target = makeTarget()
    target.config.agentKey = 'atlas'
    target.parseAgentIdFromSessionKey = vi.fn(() => 'atlas')
    const handlers = new ArtifactBrainScholarService().getHandlers(target)

    const result = await handlers.resolve_agent_brain(
      { agent_key: 'mastermind_coach' },
      'agent:atlas:stub',
    )

    expect(result).toMatchObject({
      success: true,
      agent_id: 'mastermind_coach',
      brain_id: 'brain-mastermind-coach',
      provisioned: true,
    })
  })

  it('routes user brain saves through save_user_memory', async () => {
    const target = makeTarget()
    const handlers = new ArtifactBrainScholarService().getHandlers(target)

    const result = await handlers.atlas_save_brain_context(
      {
        target_brain: 'user',
        content: 'User prefers direct weekly launch summaries.',
        intent: 'preference',
      },
      'agent:atlas:stub',
    )

    expect(result).toMatchObject({ success: true, target_action: 'save_user_memory' })
    expect(target.executeAction).toHaveBeenCalledWith(
      'save_user_memory',
      expect.objectContaining({
        content: 'User prefers direct weekly launch summaries.',
        memory_type: 'preference',
        source_type: 'mcp',
      }),
      'agent:atlas:stub',
    )
  })

  it('asks for customer identity context before saving unanchored customer brain context', async () => {
    const target = makeTarget()
    const handlers = new ArtifactBrainScholarService().getHandlers(target)

    const result = await handlers.atlas_save_brain_context(
      { target_brain: 'customer', content: 'Customer prefers concise renewal emails.' },
      'agent:atlas:stub',
    )

    expect(result).toMatchObject({
      success: false,
      needs_context: true,
      missing: ['contact_id_or_source_identity'],
      errorCode: 'CUSTOMER_MEMORY_SOURCE_REQUIRED',
    })
    expect(target.executeAction).not.toHaveBeenCalled()
  })

  it('routes source-anchored customer brain saves through save_customer_memory', async () => {
    const target = makeTarget()
    const handlers = new ArtifactBrainScholarService().getHandlers(target)

    const result = await handlers.atlas_save_brain_context(
      {
        target_brain: 'customer',
        content: 'A public widget visitor asked for clearer renewal emails.',
        conversation_id: 'conversation-1',
        visitor_id: 'visitor-1',
      },
      'agent:atlas:stub',
    )

    expect(result).toMatchObject({ success: true, target_action: 'save_customer_memory' })
    expect(target.executeAction).toHaveBeenCalledWith(
      'save_customer_memory',
      expect.objectContaining({
        content: 'A public widget visitor asked for clearer renewal emails.',
        conversation_id: 'conversation-1',
        visitor_id: 'visitor-1',
        memory_type: 'insight',
      }),
      'agent:atlas:stub',
    )
  })

  it('routes company brain saves through proposed signal creation', async () => {
    const target = makeTarget()
    const handlers = new ArtifactBrainScholarService().getHandlers(target)

    const result = await handlers.atlas_save_brain_context(
      {
        target_brain: 'company',
        content: 'Pricing claims must include implementation effort.',
        intent: 'standard',
        title: 'Pricing claims standard',
      },
      'agent:atlas:stub',
    )

    expect(result).toMatchObject({ success: true, target_action: 'propose_company_brain_signal' })
    expect(target.executeAction).toHaveBeenCalledWith(
      'propose_company_brain_signal',
      expect.objectContaining({
        signal_type: 'standard',
        truth: 'Pricing claims must include implementation effort.',
        source_title: 'Pricing claims standard',
      }),
      'agent:atlas:stub',
    )
  })

  it('resolves agent brain before routing agent saves through SK ingestion', async () => {
    const target = makeTarget()
    target.config.agentKey = 'atlas'
    target.parseAgentIdFromSessionKey = vi.fn(() => 'atlas')
    const handlers = new ArtifactBrainScholarService().getHandlers(target)

    const result = await handlers.atlas_save_brain_context(
      {
        target_brain: 'agent',
        agent_key: 'mastermind_coach',
        content: 'This agent should qualify pricing objections before writing copy.',
        title: 'Pricing objection qualification',
      },
      'agent:atlas:stub',
    )

    expect(result).toMatchObject({ success: true, target_action: 'ingest_agent_brain_text' })
    expect(target.executeAction).toHaveBeenCalledWith(
      'ingest_agent_brain_text',
      expect.objectContaining({
        brain_id: 'brain-mastermind-coach',
        title: 'Pricing objection qualification',
        sourceType: 'mcp',
      }),
      'agent:atlas:stub',
    )
  })

  it('returns user brain stats from the default brain', async () => {
    const db: Db = {
      ns_brains: [
        {
          id: 'brain-user',
          owner_id: 'user-1',
          scope: 'user',
          org_id: null,
          is_default: true,
        },
      ],
      ns_memories: [
        { id: 'memory-1', brain_id: 'brain-user' },
        { id: 'memory-2', brain_id: 'brain-user' },
      ],
      ns_sk_entries: [
        { id: 'sk-1', brain_id: 'brain-user', domain: 'sales' },
        { id: 'sk-2', brain_id: 'brain-user', domain: 'sales' },
        { id: 'sk-3', brain_id: 'brain-user', domain: 'ops' },
      ],
    }
    const handlers = new ArtifactBrainScholarService().getHandlers(makeDbTarget(db))

    const result = await handlers.get_brain_stats({ scope: 'user' }, 'agent:atlas:stub')

    expect(result).toMatchObject({
      success: true,
      scope: 'user',
      brain_id: 'brain-user',
      totalMemories: 2,
      totalSkEntries: 3,
      topDomains: [
        { domain: 'sales', count: 2 },
        { domain: 'ops', count: 1 },
      ],
    })
  })

  it('lists active narrative pages for an accessible brain', async () => {
    const db: Db = {
      ns_brains: [{ id: 'brain-user', owner_id: 'user-1', scope: 'user', org_id: null }],
      ns_narrative_pages: [
        {
          id: 'page-1',
          brain_id: 'brain-user',
          slug: 'overview',
          status: 'active',
          content_md: 'full page content',
        },
        { id: 'page-2', brain_id: 'brain-user', slug: 'archive', status: 'archived' },
      ],
    }
    const handlers = new ArtifactBrainScholarService().getHandlers(makeDbTarget(db))

    const result = await handlers.get_brain_pages(
      { brain_type: 'user', brain_id: 'brain-user' },
      'agent:atlas:stub',
    )

    expect(result).toMatchObject({
      success: true,
      count: 1,
      pagination: { limit: 20, cursor: null, next_cursor: null, has_more: false },
      result_policy: { mode: 'summary', omitted_fields: ['content_md'] },
      pages: [expect.objectContaining({ id: 'page-1', slug: 'overview' })],
    })
    expect((result as any).pages[0].content_md).toBeUndefined()
  })

  it('returns cursor pagination for broad brain cognition reads', async () => {
    const patterns = Array.from({ length: 30 }, (_, index) => ({
      id: `belief-${index}`,
      brain_id: 'brain-user',
      subject_id: 'user-1',
      pattern_name: `Pattern ${index}`,
      description: index === 0 ? 'x'.repeat(13_000) : `Description ${index}`,
      supporting_memories: ['memory-1'],
      emotional_signature: { tension: 'high' },
      strength: 1 - index / 100,
      status: 'active',
    }))
    const perspectives = Array.from({ length: 25 }, (_, index) => ({
      id: `perspective-${index}`,
      brain_id: 'brain-user',
      subject_id: 'user-1',
      name: `Perspective ${index}`,
      description: `Description ${index}`,
      narrative_md: 'long narrative',
      blind_spots: 'blind spot',
      strength: 1 - index / 100,
      status: 'active',
    }))
    const db: Db = {
      ns_brains: [
        {
          id: 'brain-user',
          owner_id: 'user-1',
          scope: 'user',
          org_id: null,
          is_default: true,
        },
      ],
      ns_belief_patterns: patterns,
      ns_perspectives: perspectives,
    }
    const handlers = new ArtifactBrainScholarService().getHandlers(makeDbTarget(db))

    const beliefResult = await handlers.get_brain_belief_patterns(
      { brain_type: 'user', brain_id: 'brain-user', status: 'active', limit: 200 },
      'agent:atlas:stub',
    )
    const perspectiveResult = await handlers.get_brain_perspectives(
      { brain_type: 'user', brain_id: 'brain-user', status: 'active', limit: 200 },
      'agent:atlas:stub',
    )

    expect(beliefResult).toMatchObject({
      success: true,
      count: 20,
      pagination: { limit: 20, cursor: null, next_cursor: expect.any(String), has_more: true },
      result_policy: { mode: 'summary' },
    })
    expect((beliefResult as any).patterns[0].supporting_memories).toBeUndefined()
    expect((beliefResult as any).patterns[0].emotional_signature).toBeUndefined()

    const nextBeliefResult = await handlers.get_brain_belief_patterns(
      {
        brain_type: 'user',
        brain_id: 'brain-user',
        status: 'active',
        limit: 20,
        cursor: (beliefResult as any).pagination.next_cursor,
      },
      'agent:atlas:stub',
    )

    expect(nextBeliefResult).toMatchObject({
      success: true,
      count: 10,
      pagination: {
        limit: 20,
        cursor: (beliefResult as any).pagination.next_cursor,
        next_cursor: null,
        has_more: false,
      },
    })
    expect((nextBeliefResult as any).patterns[0].id).toBe('belief-20')

    expect(perspectiveResult).toMatchObject({
      success: true,
      count: 20,
      pagination: { limit: 20, cursor: null, next_cursor: expect.any(String), has_more: true },
      result_policy: { mode: 'summary' },
    })
    expect((perspectiveResult as any).perspectives[0].narrative_md).toBeUndefined()
    expect((perspectiveResult as any).perspectives[0].blind_spots).toBeUndefined()
  })

  it('creates an agent brain belief pattern scoped to the brain subject', async () => {
    const db: Db = {
      ns_brains: [
        {
          id: 'brain-agent',
          owner_id: 'user-1',
          scope: 'agent',
          org_id: 'org-1',
          is_default: false,
          agent_id: 'atlas',
        },
      ],
      ns_belief_patterns: [],
    }
    const handlers = new ArtifactBrainScholarService().getHandlers(makeDbTarget(db))

    const result = await handlers.create_brain_belief_pattern(
      {
        brain_type: 'agent',
        brain_id: 'brain-agent',
        pattern_name: 'Launch urgency',
        description: 'Moves faster when launch windows are explicit.',
        strength: 0.7,
      },
      'agent:atlas:stub',
    )

    expect(result).toMatchObject({ success: true })
    expect(db.ns_belief_patterns[0]).toMatchObject({
      brain_id: 'brain-agent',
      subject_id: 'brain-agent',
      pattern_name: 'Launch urgency',
      status: 'active',
    })
  })

  it('enqueues a brain lint job for Cortex Max brains', async () => {
    const db: Db = {
      ns_brains: [
        {
          id: 'brain-user',
          owner_id: 'user-1',
          scope: 'user',
          org_id: 'org-1',
          cortex_max: true,
        },
      ],
      brain_ops_outbox: [],
    }
    const handlers = new ArtifactBrainScholarService().getHandlers(makeDbTarget(db))

    const result = await handlers.run_brain_lint(
      { brain_type: 'user', brain_id: 'brain-user' },
      'agent:atlas:stub',
    )

    expect(result).toMatchObject({ success: true, message: 'Lint job enqueued' })
    expect(db.brain_ops_outbox[0]).toMatchObject({
      brain_id: 'brain-user',
      user_id: 'user-1',
      org_id: 'org-1',
      event_type: 'brain_lint',
    })
  })
})
