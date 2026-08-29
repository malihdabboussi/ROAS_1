import { describe, expect, it, vi } from 'vitest'
import { withScopeDefaults } from '../artifact-action.registry'
import { ArtifactTasksService } from '../artifact-tasks.service'

type Db = Record<string, Array<Record<string, any>>>

class QueryBuilder {
  private filters: Array<{
    key: string
    value: unknown
    mode: 'eq' | 'is' | 'in' | 'neq' | 'ilike'
  }> = []
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: any
  private maxRows: number | null = null
  private countRequested = false

  constructor(
    private readonly db: Db,
    private readonly table: string,
  ) {}

  select(_columns?: string, options?: { count?: string }) {
    this.countRequested = options?.count === 'exact'
    return this
  }

  eq(key: string, value: unknown) {
    this.filters.push({ key, value, mode: 'eq' })
    return this
  }

  neq(key: string, value: unknown) {
    this.filters.push({ key, value, mode: 'neq' })
    return this
  }

  in(key: string, value: unknown[]) {
    this.filters.push({ key, value, mode: 'in' })
    return this
  }

  ilike(key: string, value: string) {
    this.filters.push({ key, value, mode: 'ilike' })
    return this
  }

  contains(key: string, value: unknown) {
    this.filters.push({
      key: `__contains:${key}`,
      value,
      mode: 'eq',
    })
    return this
  }

  is(key: string, value: unknown) {
    this.filters.push({ key, value, mode: 'is' })
    return this
  }

  order() {
    return this
  }

  limit(limit: number) {
    this.maxRows = limit
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

  private valueAt(row: Record<string, any>, key: string) {
    const customMatch = key.match(/^custom_data->>(.+)$/)
    if (customMatch) {
      const custom = row.custom_data && typeof row.custom_data === 'object' ? row.custom_data : {}
      return custom[customMatch[1]]
    }
    return row[key]
  }

  private matches(row: Record<string, any>) {
    return this.filters.every((filter) => {
      if (filter.mode === 'is') {
        // Supabase treats missing columns as NULL; the in-memory fixture should too.
        const value = this.valueAt(row, filter.key)
        return value === filter.value || (filter.value === null && value === undefined)
      }
      if (filter.key.startsWith('__contains:')) {
        const rowValues = this.valueAt(row, filter.key.slice('__contains:'.length))
        const expected =
          typeof filter.value === 'string'
            ? (JSON.parse(filter.value) as Array<Record<string, unknown>>)
            : []
        return (
          Array.isArray(rowValues) &&
          expected.every((entry) =>
            rowValues.some((rowEntry) => JSON.stringify(rowEntry) === JSON.stringify(entry)),
          )
        )
      }
      const value = this.valueAt(row, filter.key)
      if (filter.mode === 'neq') return value !== filter.value
      if (filter.mode === 'in') {
        return Array.isArray(filter.value) && filter.value.map(String).includes(String(value))
      }
      if (filter.mode === 'ilike') {
        const pattern = String(filter.value).replace(/^%/, '').replace(/%$/, '').toLowerCase()
        return String(value ?? '')
          .toLowerCase()
          .includes(pattern)
      }
      return String(value ?? '') === String(filter.value ?? '')
    })
  }

  private async execute() {
    if (!this.db[this.table]) this.db[this.table] = []
    if (this.op === 'insert') {
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
    return {
      data: this.maxRows ? rows.slice(0, this.maxRows) : rows,
      error: null,
      count: this.countRequested ? rows.length : null,
    }
  }
}

function makeTarget(
  db: Db,
  options?: {
    uploadedAttachments?: Array<Record<string, unknown>>
    indexedSources?: Array<Record<string, unknown>>
    orgId?: string | null
    requestContext?: Record<string, unknown> | null
  },
) {
  const supabase = {
    from: (table: string) => new QueryBuilder(db, table),
  }
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => options?.orgId ?? null),
    getUserClient: vi.fn(async () => supabase),
    requestContext: {
      getUploadedAttachments: vi.fn(() => options?.uploadedAttachments ?? []),
      get: vi.fn(() => options?.requestContext ?? null),
    },
    spaceAssetIndexService: options?.indexedSources
      ? {
          indexSource: vi.fn(async (_client, payload) => {
            options.indexedSources!.push(payload)
          }),
        }
      : undefined,
  }
}

function makeSpace(schema: Record<string, unknown>) {
  return {
    id: 'space-1',
    user_id: 'user-1',
    org_id: 'user-1',
    title: 'Tasks',
    visibility: 'private',
    campaign_id: null,
    schema,
  }
}

const schema = {
  fields: [
    { id: 'title', type: 'text' },
    {
      id: 'status',
      type: 'select',
      options: [
        { id: 'spaces', label: 'Spaces' },
        { id: 'missions', label: 'Missions' },
      ],
    },
    {
      id: 'priority',
      type: 'select',
      options: [
        { id: 'low', label: 'Low' },
        { id: 'high', label: 'High' },
      ],
    },
    {
      id: 'tags',
      type: 'multi_select',
      options: [
        { id: 'follow-up', label: 'Follow Up' },
        { id: 'vip', label: 'VIP' },
      ],
    },
    { id: 'category', type: 'select', options: [{ id: 'sales', label: 'Sales' }] },
    { id: 'budget', type: 'currency' },
  ],
}

const workflowSchema = {
  fields: [
    { id: 'title', type: 'text' },
    {
      id: 'status',
      type: 'select',
      options: [
        { id: 'backlog', label: 'Backlog', group: 'not_started' },
        { id: 'working', label: 'Working', group: 'active' },
        { id: 'done', label: 'Done', group: 'closed' },
      ],
    },
  ],
}

const developmentSchema = {
  fields: [
    { id: 'title', type: 'text' },
    {
      id: 'status',
      type: 'select',
      options: [
        { id: 'todo', label: 'to do', color: 'cyan', group: 'not_started' },
        { id: 'need_more_information', label: 'NEED MORE INFORMATION', color: 'rose' },
        { id: 'done', label: 'Done', color: 'emerald', group: 'closed' },
      ],
    },
    {
      id: 'priority',
      type: 'select',
      options: [{ id: 'high', label: 'High', color: 'orange' }],
    },
    {
      id: 'category',
      type: 'select',
      options: [
        { id: 'bugs', label: 'Bugs', color: 'red' },
        { id: 'dev_debt', label: 'Dev Debt', color: 'slate' },
      ],
    },
  ],
}

describe('ArtifactTasksService', () => {
  it('rejects status not present in the live space schema', async () => {
    const db: Db = { spaces: [makeSpace(schema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .create_task(
        { space_id: 'space-1', title: 'Bad status', status: 'todo' },
        'agent:copywriter:stub',
      )) as { success: boolean; error: string }

    expect(result.success).toBe(false)
    expect(result.error).toContain('Valid statuses: Spaces (spaces), Missions (missions)')
  })

  it('accepts user-renamed status options and creates a task', async () => {
    const db: Db = { spaces: [makeSpace(schema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .create_task(
        { space_id: 'space-1', title: 'Good status', status: 'spaces' },
        'agent:copywriter:stub',
      )) as { success: boolean; task: Record<string, unknown> }

    expect(result.success).toBe(true)
    expect(result.task.status).toBe('spaces')
    expect(db.space_item_activity[0].event_type).toBe('created')
  })

  it('defaults new tasks to the space not-started status when status is omitted', async () => {
    const db: Db = { spaces: [makeSpace(workflowSchema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .create_task({ space_id: 'space-1', title: 'Default status' }, 'agent:vibey:stub')) as {
      success: boolean
      task: Record<string, unknown>
    }

    expect(result.success).toBe(true)
    expect(result.task.status).toBe('backlog')
  })

  it('stores explicit create_task attachments on the created activity', async () => {
    const db: Db = { spaces: [makeSpace(workflowSchema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()
    const attachments = [
      {
        filename: 'creative.png',
        mimeType: 'image/png',
        fileUrl: 'https://files.example/creative.png',
        sizeBytes: 12345,
      },
    ]

    const result = (await service
      .getHandlers(makeTarget(db))
      .create_task(
        { space_id: 'space-1', title: 'Review creative', attachments },
        'agent:vibey:stub',
      )) as { success: boolean }

    expect(result.success).toBe(true)
    expect(db.space_item_activity[0].event_type).toBe('created')
    expect(db.space_item_activity[0].payload.attachments).toEqual(attachments)
  })

  it('attaches current request uploads to created task activity when action omits attachments', async () => {
    const db: Db = { spaces: [makeSpace(workflowSchema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()
    const indexedSources: Array<Record<string, unknown>> = []
    const conversationId = '00000000-0000-0000-0000-000000000123'
    const uploadedAttachments = [
      {
        filename: 'screenshot.png',
        mimeType: 'image/png',
        fileUrl: 'https://files.example/screenshot.png',
        type: 'image',
      },
    ]

    const result = (await service
      .getHandlers(makeTarget(db, { uploadedAttachments, indexedSources }))
      .create_task(
        { space_id: 'space-1', title: 'Use uploaded screenshot' },
        `agent:vibey:${conversationId}`,
      )) as { success: boolean }

    expect(result.success).toBe(true)
    expect(db.space_item_activity[0].payload.attachments).toEqual(uploadedAttachments)
    expect(indexedSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'space_activity',
          sourceId: db.space_item_activity[0].id,
          userId: 'user-1',
          orgId: null,
        }),
      ]),
    )
  })

  it('rejects closed statuses on task creation', async () => {
    const db: Db = { spaces: [makeSpace(workflowSchema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .create_task(
        { space_id: 'space-1', title: 'Already done', status: 'done' },
        'agent:vibey:stub',
      )) as { success: boolean; error: string }

    expect(result.success).toBe(false)
    expect(result.error).toContain('closed status')
    expect(db.space_items).toHaveLength(0)
  })

  it('maps top-level create_task category labels into custom_data.category', async () => {
    const db: Db = {
      spaces: [makeSpace(developmentSchema)],
      space_items: [],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).create_task(
      {
        space_id: 'space-1',
        title: 'Bug from chat',
        status: 'to do',
        category: 'bug',
      },
      'agent:vibey:stub',
    )) as { success: boolean; task: Record<string, any> }

    expect(result.success).toBe(true)
    expect(result.task.status).toBe('todo')
    expect(result.task.custom_data).toEqual({ category: 'bugs' })
  })

  it('maps create_task custom_data category labels to schema option ids', async () => {
    const db: Db = {
      spaces: [makeSpace(developmentSchema)],
      space_items: [],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).create_task(
      {
        space_id: 'space-1',
        title: 'Bug from custom data',
        custom_data: { category: 'BUGS' },
      },
      'agent:vibey:stub',
    )) as { success: boolean; task: Record<string, any> }

    expect(result.success).toBe(true)
    expect(result.task.custom_data).toEqual({ category: 'bugs' })
  })

  it('rejects invalid create_task category labels with valid options', async () => {
    const db: Db = {
      spaces: [makeSpace(developmentSchema)],
      space_items: [],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).create_task(
      {
        space_id: 'space-1',
        title: 'Bad category',
        category: 'bugz',
      },
      'agent:vibey:stub',
    )) as { success: boolean; error: string }

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid category "bugz"')
    expect(result.error).toContain('Bugs (bugs)')
    expect(db.space_items).toHaveLength(0)
  })

  it('stamps agent-created tasks as agent source and ignores model-provided source', async () => {
    const db: Db = { spaces: [makeSpace(schema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).create_task(
      {
        space_id: 'space-1',
        title: 'Agent task',
        status: 'spaces',
        source: 'not-a-real-source',
      },
      'agent:copywriter:stub',
    )) as { success: boolean; task: Record<string, unknown> }

    expect(result.success).toBe(true)
    expect(result.task.source).toBe('agent')
  })

  it('stamps Slack-created tasks with server-owned thread provenance', async () => {
    const db: Db = { spaces: [makeSpace(schema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()
    const conversationId = '00000000-0000-0000-0000-000000000999'
    const target = makeTarget(db, {
      requestContext: {
        channel: 'slack',
        channelMember: {
          platform_id: 'U123',
          source_context: {
            slack_team_id: 'T123',
            slack_channel_id: 'C123',
            slack_thread_ts: '100.1',
            slack_message_ts: '101.2',
            source_excerpt: 'Hey Pixel, make sure I send Curtis the recap.',
          },
        },
      },
    })

    const result = (await service
      .getHandlers(target)
      .create_task(
        { space_id: 'space-1', title: 'Send Curtis the recap', status: 'spaces' },
        `agent:pixel:${conversationId}`,
      )) as { success: boolean; task: Record<string, any> }

    expect(result.success).toBe(true)
    expect(result.task.custom_data.action_provenance).toEqual({
      source_kind: 'slack_thread',
      source_id: 'slack:T123:C123:101.2',
      source_excerpt: 'Hey Pixel, make sure I send Curtis the recap.',
      conversation_id: conversationId,
      slack_team_id: 'T123',
      slack_channel_id: 'C123',
      slack_thread_ts: '100.1',
      slack_message_ts: '101.2',
      slack_user_id: 'U123',
    })
  })

  it('resolves create_task human assignee_name from active organization members', async () => {
    const memberId = '00000000-0000-0000-0000-000000000002'
    const db: Db = {
      spaces: [makeSpace(schema)],
      space_items: [],
      space_item_activity: [],
      org_members: [
        {
          org_id: 'org-1',
          user_id: memberId,
          status: 'active',
          profiles: { id: memberId, full_name: 'Sefy Founder', email: 'sefy@example.com' },
        },
      ],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db, { orgId: 'org-1' })).create_task(
      {
        space_id: 'space-1',
        title: 'Review launch QA',
        assignee_type: 'human',
        assignee_name: 'Sefy',
      },
      'agent:vibey:stub',
    )) as { success: boolean; task: Record<string, unknown> }

    expect(result.success).toBe(true)
    expect(result.task.assignee_type).toBe('human')
    expect(result.task.assignee_id).toBe(memberId)
  })

  it('resolves update_task human assignee_email from active organization members', async () => {
    const memberId = '00000000-0000-0000-0000-000000000003'
    const db: Db = {
      spaces: [makeSpace(schema)],
      space_items: [
        {
          id: 'task-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Existing',
          status: 'spaces',
          assignee_type: 'unassigned',
          assignee_id: null,
        },
      ],
      space_item_activity: [],
      org_members: [
        {
          org_id: 'org-1',
          user_id: memberId,
          status: 'active',
          profiles: { id: memberId, full_name: 'Dylan Operator', email: 'dylan@example.com' },
        },
      ],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db, { orgId: 'org-1' })).update_task(
      {
        space_id: 'space-1',
        task_id: 'task-1',
        assignee_type: 'human',
        assignee_email: 'dylan@example.com',
      },
      'agent:vibey:stub',
    )) as { success: boolean; task: Record<string, unknown> }

    expect(result.success).toBe(true)
    expect(result.task.assignee_type).toBe('human')
    expect(result.task.assignee_id).toBe(memberId)
  })

  it('rejects ambiguous human assignee names without creating a task', async () => {
    const db: Db = {
      spaces: [makeSpace(schema)],
      space_items: [],
      space_item_activity: [],
      org_members: [
        {
          org_id: 'org-1',
          user_id: '00000000-0000-0000-0000-000000000004',
          status: 'active',
          profiles: { full_name: 'Sefy Founder', email: 'sefy@example.com' },
        },
        {
          org_id: 'org-1',
          user_id: '00000000-0000-0000-0000-000000000005',
          status: 'active',
          profiles: { full_name: 'Sefy Ops', email: 'sefy.ops@example.com' },
        },
      ],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db, { orgId: 'org-1' })).create_task(
      {
        space_id: 'space-1',
        title: 'Ambiguous assignee',
        assignee_type: 'human',
        assignee_name: 'Sefy',
      },
      'agent:vibey:stub',
    )) as { success: boolean; error: string }

    expect(result.success).toBe(false)
    expect(result.error).toContain('Multiple active organization members matched')
    expect(db.space_items).toHaveLength(0)
  })

  it('rejects invalid custom_data tags', async () => {
    const db: Db = { spaces: [makeSpace(schema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).create_task(
      {
        space_id: 'space-1',
        title: 'Tagged',
        status: 'spaces',
        custom_data: { tags: ['missing'] },
      },
      'agent:copywriter:stub',
    )) as { success: boolean; error: string }

    expect(result.success).toBe(false)
    expect(result.error).toContain('missing')
  })

  it('allows unknown custom_data keys with a warning', async () => {
    const db: Db = { spaces: [makeSpace(schema)], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).create_task(
      {
        space_id: 'space-1',
        title: 'Unknown custom field',
        status: 'spaces',
        custom_data: { extra_signal: 'keep me' },
      },
      'agent:copywriter:stub',
    )) as { success: boolean; warnings: string[] }

    expect(result.success).toBe(true)
    expect(result.warnings[0]).toContain('extra_signal')
  })

  it('shallow-merges custom_data on update and replaces arrays wholesale', async () => {
    const db: Db = {
      spaces: [makeSpace(schema)],
      space_items: [
        {
          id: 'task-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Existing',
          status: 'spaces',
          custom_data: { tags: ['follow-up'], category: 'sales', email: 'a@b.com' },
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).update_task(
      {
        space_id: 'space-1',
        task_id: 'task-1',
        custom_data: { tags: ['vip'] },
      },
      'agent:copywriter:stub',
    )) as { success: boolean; task: Record<string, any> }

    expect(result.success).toBe(true)
    expect(result.task.custom_data).toEqual({ tags: ['vip'], category: 'sales', email: 'a@b.com' })
  })

  it('maps top-level update_task category labels into custom_data.category', async () => {
    const db: Db = {
      spaces: [makeSpace(developmentSchema)],
      space_items: [
        {
          id: 'task-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Existing',
          status: 'todo',
          custom_data: { category: 'dev_debt', email: 'a@b.com' },
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).update_task(
      {
        space_id: 'space-1',
        task_id: 'task-1',
        category: 'Bugs',
      },
      'agent:vibey:stub',
    )) as { success: boolean; task: Record<string, any> }

    expect(result.success).toBe(true)
    expect(result.task.custom_data).toEqual({ category: 'bugs', email: 'a@b.com' })
  })

  it('adds task comments with mentions', async () => {
    const db: Db = {
      spaces: [makeSpace(schema)],
      space_items: [{ id: 'task-1', space_id: 'space-1', user_id: 'user-1', title: 'Existing' }],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).add_task_comment(
      {
        space_id: 'space-1',
        task_id: 'task-1',
        message: 'Please review',
        mentions: [{ type: 'agent', agent_key: 'copywriter' }],
      },
      'agent:copywriter:stub',
    )) as { success: boolean; activity: Record<string, any> }

    expect(result.success).toBe(true)
    expect(result.activity.event_type).toBe('comment')
    expect(result.activity.payload.mentions[0].agent_key).toBe('copywriter')
  })

  it('auto-creates a default task space when no space exists and no space_id is passed', async () => {
    const db: Db = { spaces: [], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .create_task({ title: 'First task' }, 'agent:vibey:stub')) as {
      success: boolean
      task: Record<string, unknown>
      space_id: string
      ensured_space: { created: boolean }
    }

    expect(result.success).toBe(true)
    expect(result.ensured_space.created).toBe(true)
    expect(db.spaces.length).toBe(1)
    expect(db.spaces[0].title).toBe('My Tasks')
    expect(result.space_id).toBe(db.spaces[0].id)
    expect(result.task.space_id).toBe(db.spaces[0].id)
    expect(result.task.status).toBe('todo')
  })

  it('reuses an existing space with a task-style view when no space_id is passed', async () => {
    const existingSpace = { ...makeSpace(schema), org_id: null }
    const db: Db = {
      spaces: [{ ...existingSpace, schema: { ...schema, views: [{ id: 'list', type: 'list' }] } }],
      space_items: [],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .create_task({ title: 'Reuse it', status: 'spaces' }, 'agent:vibey:stub')) as {
      success: boolean
      space_id: string
      ensured_space: { created: boolean }
    }

    expect(result.success).toBe(true)
    expect(result.space_id).toBe(existingSpace.id)
    expect(result.ensured_space.created).toBe(false)
    expect(db.spaces.length).toBe(1)
  })

  it('patches a task view into an existing blank space before creating a task', async () => {
    const db: Db = {
      spaces: [{ ...makeSpace(schema), schema: { ...schema, views: [] } }],
      space_items: [],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .create_task(
        { space_id: 'space-1', title: 'Needs visible task', status: 'spaces' },
        'agent:vibey:stub',
      )) as {
      success: boolean
      task: Record<string, unknown>
    }

    expect(result.success).toBe(true)
    expect(result.task.space_id).toBe('space-1')
    expect(db.spaces[0].schema.views).toEqual([
      expect.objectContaining({ id: 'list', type: 'list' }),
    ])
  })

  it('uses active personal scope defaults before creating a task', async () => {
    const existingSpace = {
      ...makeSpace(schema),
      org_id: null,
      schema: { ...schema, views: [{ id: 'list', type: 'list' }] },
    }
    const db: Db = { spaces: [existingSpace], space_items: [], space_item_activity: [] }
    const service = new ArtifactTasksService()
    const scopedInput = withScopeDefaults(
      'create_task',
      { title: 'Scoped task', status: 'spaces' },
      {
        space_id: existingSpace.id,
        campaign_id: null,
        scope_kind: 'personal',
        org_id: null,
      },
    )

    const result = (await service
      .getHandlers(makeTarget(db))
      .create_task(scopedInput, 'agent:vibey:stub')) as {
      success: boolean
      space_id: string
      task: Record<string, unknown>
    }

    expect(result.success).toBe(true)
    expect(result.space_id).toBe(existingSpace.id)
    expect(result.task.space_id).toBe(existingSpace.id)
  })

  it('returns a delete confirmation envelope', async () => {
    const db: Db = {
      spaces: [makeSpace(schema)],
      space_items: [{ id: 'task-1', space_id: 'space-1', user_id: 'user-1', title: 'Existing' }],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .delete_task({ space_id: 'space-1', task_id: 'task-1' }, 'agent:copywriter:stub')) as {
      success: boolean
      status: string
      ui_blocks: Array<Record<string, unknown>>
    }

    expect(result.success).toBe(true)
    expect(result.status).toBe('pending_approval')
    expect(result.ui_blocks[0]).toMatchObject({
      type: 'delete_confirm',
      delete_action: 'delete_task',
      entity_type: 'task',
      entity_id: 'task-1',
    })
  })

  it('gets a task with parent, subtasks, and activity', async () => {
    const db: Db = {
      spaces: [makeSpace(schema)],
      space_items: [
        {
          id: 'parent-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Parent',
          status: 'spaces',
        },
        {
          id: 'task-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Existing',
          status: 'spaces',
          parent_item_id: 'parent-1',
        },
        {
          id: 'subtask-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Child',
          parent_item_id: 'task-1',
          sort_order: 1,
        },
      ],
      space_item_activity: [
        {
          id: 'activity-1',
          item_id: 'task-1',
          space_id: 'space-1',
          event_type: 'comment',
          payload: { message: 'Ready' },
        },
      ],
    }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .get_task({ space_id: 'space-1', task_id: 'task-1' }, 'agent:vibey:stub')) as {
      success: boolean
      task: Record<string, unknown>
      parent: Record<string, unknown> | null
      subtasks: Record<string, unknown>[]
      activity: Record<string, unknown>[]
    }

    expect(result.success).toBe(true)
    expect(result.task.id).toBe('task-1')
    expect(result.parent?.id).toBe('parent-1')
    expect(result.subtasks).toEqual([expect.objectContaining({ id: 'subtask-1' })])
    expect(result.activity).toEqual([expect.objectContaining({ id: 'activity-1' })])
  })

  it('lists personal general spaces with owner scope', async () => {
    const db: Db = {
      spaces: [
        { ...makeSpace(schema), id: 'personal-general', org_id: null, campaign_id: null },
        { ...makeSpace(schema), id: 'personal-campaign', org_id: null, campaign_id: 'campaign-1' },
        { ...makeSpace(schema), id: 'other-user', user_id: 'user-2', org_id: null },
        { ...makeSpace(schema), id: 'org-space', user_id: 'user-2', org_id: 'org-1' },
      ],
      space_items: [],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .list_spaces({ general: true, limit: 10 }, 'agent:vibey:stub')) as {
      success: boolean
      spaces: Record<string, unknown>[]
    }

    expect(result.success).toBe(true)
    expect(result.spaces.map((space) => space.id)).toEqual(['personal-general'])
  })

  it('filters list_tasks by custom category before applying limit', async () => {
    const db: Db = {
      spaces: [makeSpace(workflowSchema)],
      space_items: [
        {
          id: 'todo-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Wrong slice',
          status: 'backlog',
          custom_data: { category: 'todo' },
        },
        {
          id: 'bug-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Correct bug',
          status: 'working',
          custom_data: { category: 'bugs' },
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).list_tasks(
      {
        space_id: 'space-1',
        status: 'working',
        category: 'bugs',
        limit: 1,
        include_count: true,
        fields: 'summary',
      },
      'agent:vibey:stub',
    )) as { success: boolean; tasks: Record<string, unknown>[]; total_count: number }

    expect(result.success).toBe(true)
    expect(result.total_count).toBe(1)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].id).toBe('bug-1')
  })

  it('returns schema summaries and display labels from list_tasks', async () => {
    const db: Db = {
      spaces: [makeSpace(developmentSchema)],
      space_items: [
        {
          id: 'bug-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Needs info',
          status: 'need_more_information',
          priority: 'high',
          custom_data: { category: 'bugs' },
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).list_tasks(
      {
        space_id: 'space-1',
        include_count: true,
        fields: 'summary',
      },
      'agent:vibey:stub',
    )) as {
      success: boolean
      schema_summary: {
        statuses: Array<Record<string, unknown>>
        categories: Array<Record<string, unknown>>
      }
      tasks: Record<string, unknown>[]
    }

    expect(result.success).toBe(true)
    expect(result.schema_summary.statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'need_more_information',
          label: 'NEED MORE INFORMATION',
          color: 'rose',
        }),
      ]),
    )
    expect(result.schema_summary.categories).toEqual([
      expect.objectContaining({ id: 'bugs', label: 'Bugs' }),
      expect.objectContaining({ id: 'dev_debt', label: 'Dev Debt' }),
    ])
    expect(result.tasks[0]).toMatchObject({
      id: 'bug-1',
      status_label: 'NEED MORE INFORMATION',
      priority_label: 'High',
      category_label: 'Bugs',
    })
  })

  it('maps list_tasks human status labels to schema option ids', async () => {
    const db: Db = {
      spaces: [makeSpace(developmentSchema)],
      space_items: [
        {
          id: 'bug-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Needs info',
          status: 'need_more_information',
          custom_data: { category: 'bugs' },
        },
        {
          id: 'todo-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Todo',
          status: 'todo',
          custom_data: { category: 'bugs' },
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).list_tasks(
      {
        space_id: 'space-1',
        status: 'NEED MORE INFORMATION',
        category: 'Bugs',
        include_count: true,
      },
      'agent:vibey:stub',
    )) as { success: boolean; tasks: Record<string, unknown>[]; total_count: number }

    expect(result.success).toBe(true)
    expect(result.total_count).toBe(1)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]).toMatchObject({
      id: 'bug-1',
      status: 'need_more_information',
      status_label: 'NEED MORE INFORMATION',
      category_label: 'Bugs',
    })
  })

  it('rejects invalid list_tasks status filters with valid schema options', async () => {
    const db: Db = {
      spaces: [makeSpace(developmentSchema)],
      space_items: [],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db))
      .list_tasks({ space_id: 'space-1', status: 'needs_more_info' }, 'agent:vibey:stub')) as {
      success: boolean
      error: string
    }

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid status "needs_more_info"')
    expect(result.error).toContain('NEED MORE INFORMATION (need_more_information)')
  })

  it('rejects singular filter on list_tasks instead of silently ignoring it', async () => {
    const db: Db = {
      spaces: [makeSpace(developmentSchema)],
      space_items: [],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).list_tasks(
      {
        space_id: 'space-1',
        filter: { category: 'bugs' },
      },
      'agent:vibey:stub',
    )) as { success: boolean; error: string }

    expect(result.success).toBe(false)
    expect(result.error).toContain('Use filters, not filter')
  })

  it('filters list_tasks assigned_to_me across primary and multi-assignee rows before applying limit', async () => {
    const db: Db = {
      spaces: [makeSpace(workflowSchema)],
      space_items: [
        {
          id: 'unassigned-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Unassigned',
          status: 'working',
          assignee_type: 'unassigned',
          assignee_id: null,
          assignees: [],
        },
        {
          id: 'agent-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Agent task',
          status: 'working',
          assignee_type: 'agent',
          assignee_id: 'developer',
          assignees: [{ type: 'agent', id: 'developer' }],
        },
        {
          id: 'primary-human-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Primary human',
          status: 'working',
          assignee_type: 'human',
          assignee_id: 'user-1',
          assignees: [{ type: 'human', id: 'user-1' }],
        },
        {
          id: 'multi-human-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Multi human',
          status: 'working',
          assignee_type: 'agent',
          assignee_id: 'developer',
          assignees: [
            { type: 'agent', id: 'developer' },
            { type: 'human', id: 'user-1' },
          ],
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).list_tasks(
      {
        space_id: 'space-1',
        assigned_to_me: true,
        limit: 1,
        include_count: true,
        fields: 'summary',
      },
      'agent:vibey:stub',
    )) as { success: boolean; tasks: Record<string, unknown>[]; total_count: number }

    expect(result.success).toBe(true)
    expect(result.total_count).toBe(2)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].id).toBe('primary-human-1')
  })

  it('lists only the current users open tasks across spaces without a space id', async () => {
    const secondSpace = {
      ...makeSpace(workflowSchema),
      id: 'space-2',
      title: 'Client B',
      campaign_id: 'campaign-2',
    }
    const db: Db = {
      spaces: [makeSpace(workflowSchema), secondSpace],
      space_items: [
        {
          id: 'mine-open',
          space_id: 'space-1',
          org_id: 'org-1',
          user_id: 'user-1',
          title: 'My open task',
          status: 'working',
          assignee_type: 'human',
          assignee_id: 'user-1',
          assignees: [{ type: 'human', id: 'user-1' }],
        },
        {
          id: 'mine-call-action',
          space_id: 'space-1',
          org_id: 'org-1',
          user_id: 'user-1',
          title: 'Action assigned during a call',
          status: 'working',
          parent_item_id: 'meeting-record-1',
          assignee_type: 'human',
          assignee_id: 'user-1',
          assignees: [{ type: 'human', id: 'user-1' }],
        },
        {
          id: 'mine-closed',
          space_id: 'space-2',
          org_id: 'org-1',
          user_id: 'user-1',
          title: 'Already finished',
          status: 'done',
          assignee_type: 'human',
          assignee_id: 'user-1',
          assignees: [{ type: 'human', id: 'user-1' }],
        },
        {
          id: 'someone-elses',
          space_id: 'space-2',
          org_id: 'org-1',
          user_id: 'user-1',
          title: 'Not mine',
          status: 'working',
          assignee_type: 'human',
          assignee_id: 'user-2',
          assignees: [{ type: 'human', id: 'user-2' }],
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget(db, { orgId: 'org-1' }))
      .list_tasks(
        { assigned_to_me: true, fields: 'summary', include_count: true, limit: 20 },
        'agent:vibey:stub',
      )) as {
      success: boolean
      scope: string
      tasks: Record<string, unknown>[]
    }

    expect(result.success).toBe(true)
    expect(result.scope).toBe('assigned_to_me')
    expect(result.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'mine-open', space_title: 'Tasks' }),
        expect.objectContaining({ id: 'mine-call-action', space_title: 'Tasks' }),
      ]),
    )
    expect(result.tasks).toHaveLength(2)
  })

  it('honors include_closed for assigned tasks across spaces', async () => {
    const db: Db = {
      spaces: [makeSpace(workflowSchema)],
      space_items: [
        {
          id: 'mine-closed',
          space_id: 'space-1',
          org_id: 'org-1',
          user_id: 'user-1',
          title: 'Completed assigned task',
          status: 'done',
          assignee_type: 'human',
          assignee_id: 'user-1',
          assignees: [{ type: 'human', id: 'user-1' }],
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db, { orgId: 'org-1' })).list_tasks(
      { assigned_to_me: true, include_closed: true, fields: 'summary' },
      'agent:vibey:stub',
    )) as { success: boolean; tasks: Record<string, unknown>[] }

    expect(result.success).toBe(true)
    expect(result.tasks).toEqual([expect.objectContaining({ id: 'mine-closed' })])
  })

  it('keeps assigned-to-me scope across spaces when the agent also sends a space id', async () => {
    const secondSpace = {
      ...makeSpace(workflowSchema),
      id: 'space-2',
      title: 'Client B',
      campaign_id: 'campaign-2',
    }
    const db: Db = {
      spaces: [makeSpace(workflowSchema), secondSpace],
      space_items: [
        {
          id: 'mine-in-another-space',
          space_id: 'space-2',
          org_id: 'org-1',
          user_id: 'user-1',
          title: 'My task outside the incidental space',
          status: 'working',
          assignee_type: 'human',
          assignee_id: 'user-1',
          assignees: [{ type: 'human', id: 'user-1' }],
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db, { orgId: 'org-1' })).list_tasks(
      {
        space_id: 'space-1',
        assigned_to_me: true,
        fields: 'summary',
        include_count: true,
        limit: 20,
      },
      'agent:vibey:stub',
    )) as {
      success: boolean
      scope: string
      tasks: Record<string, unknown>[]
    }

    expect(result.success).toBe(true)
    expect(result.scope).toBe('assigned_to_me')
    expect(result.tasks).toEqual([
      expect.objectContaining({ id: 'mine-in-another-space', space_title: 'Client B' }),
    ])
  })

  it('fails closed when list_tasks omits both space id and assigned-to-me scope', async () => {
    const service = new ArtifactTasksService()

    const result = (await service
      .getHandlers(makeTarget({ spaces: [], space_items: [] }))
      .list_tasks({ fields: 'summary' }, 'agent:vibey:stub')) as {
      success: boolean
      error: string
    }

    expect(result).toEqual({
      success: false,
      error: 'space_id is required unless assigned_to_me is true',
    })
  })

  it('filters list_space_view_items by view type and custom filters before applying limit', async () => {
    const db: Db = {
      spaces: [
        {
          ...makeSpace(schema),
          schema: {
            ...schema,
            fields: schema.fields.map((field) =>
              field.id === 'category'
                ? { ...field, options: [{ id: 'bugs', label: 'Bugs' }] }
                : field,
            ),
            views: [{ id: 'ig', type: 'instagram_research', name: 'IG Research' }],
          },
        },
      ],
      space_items: [
        {
          id: 'task-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Task row',
          custom_data: { category: 'bugs' },
        },
        {
          id: 'ig-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'IG row',
          custom_data: {
            _view_type: 'instagram_research',
            category: 'bugs',
            _handle: 'brand',
          },
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).list_space_view_items(
      {
        space_id: 'space-1',
        view_id: 'ig',
        filters: { category: 'bugs', _handle: 'brand' },
        limit: 1,
        include_count: true,
        fields: 'summary',
      },
      'agent:vibey:stub',
    )) as { success: boolean; items: Record<string, unknown>[]; total_count: number }

    expect(result.success).toBe(true)
    expect(result.total_count).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('ig-1')
  })

  it('returns schema summaries and maps labels for list_space_view_items', async () => {
    const db: Db = {
      spaces: [
        {
          ...makeSpace(developmentSchema),
          schema: {
            ...developmentSchema,
            views: [{ id: 'bugs', type: 'list', name: 'Bugs' }],
          },
        },
      ],
      space_items: [
        {
          id: 'bug-1',
          space_id: 'space-1',
          user_id: 'user-1',
          title: 'Needs info',
          status: 'need_more_information',
          priority: 'high',
          custom_data: { category: 'bugs' },
        },
      ],
      space_item_activity: [],
    }
    const service = new ArtifactTasksService()

    const result = (await service.getHandlers(makeTarget(db)).list_space_view_items(
      {
        space_id: 'space-1',
        view_id: 'bugs',
        status: 'need more information',
        category: 'Bugs',
        priority: 'High',
        include_count: true,
      },
      'agent:vibey:stub',
    )) as {
      success: boolean
      schema_summary: { statuses: Array<Record<string, unknown>> }
      items: Record<string, unknown>[]
      total_count: number
    }

    expect(result.success).toBe(true)
    expect(result.total_count).toBe(1)
    expect(result.schema_summary.statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'need_more_information', label: 'NEED MORE INFORMATION' }),
      ]),
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: 'bug-1',
      status_label: 'NEED MORE INFORMATION',
      priority_label: 'High',
      category_label: 'Bugs',
    })
  })
})
