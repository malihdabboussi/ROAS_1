import { describe, expect, it, vi } from 'vitest'
import { ArtifactSpaceSchemaService } from '../artifact-space-schema.service'

type Db = Record<string, Array<Record<string, any>>>

class QueryBuilder {
  private filters: Array<{ key: string; value: unknown }> = []
  private op: 'select' | 'update' = 'select'
  private payload: any

  constructor(
    private readonly db: Db,
    private readonly table: string,
  ) {}

  select() {
    return this
  }

  eq(key: string, value: unknown) {
    this.filters.push({ key, value })
    return this
  }

  update(payload: any) {
    this.op = 'update'
    this.payload = payload
    return this
  }

  async maybeSingle() {
    const result = await this.execute()
    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
    return { data: rows[0] ?? null, error: null }
  }

  async single() {
    return this.maybeSingle()
  }

  then(resolve: (value: any) => void, reject: (reason?: any) => void) {
    return this.execute().then(resolve, reject)
  }

  private rows() {
    return this.db[this.table] ?? []
  }

  private matches(row: Record<string, any>) {
    return this.filters.every((filter) => String(row[filter.key] ?? '') === String(filter.value))
  }

  private async execute() {
    if (!this.db[this.table]) this.db[this.table] = []
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
    return { data: this.rows().filter((row) => this.matches(row)), error: null }
  }
}

function makeTarget(db: Db) {
  const supabase = {
    from: (table: string) => new QueryBuilder(db, table),
  }
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    getUserClient: vi.fn(async () => supabase),
  }
}

function makeSpace() {
  return {
    id: 'space-1',
    title: 'Tasks',
    schema: {
      version: 1,
      fields: [
        { id: 'title', name: 'Name', type: 'text', system: true, required: true },
        {
          id: 'status',
          name: 'Status',
          type: 'select',
          system: true,
          required: true,
          options: [{ id: 'todo', label: 'To Do', color: 'cyan' }],
        },
        { id: 'priority', name: 'Priority', type: 'select', system: true, options: [] },
        { id: 'tags', name: 'Tags', type: 'multi_select', system: true, options: [] },
      ],
      views: [
        { id: 'list', type: 'list', name: 'List', visible_fields: ['status', 'title'] },
        { id: 'board', type: 'kanban', name: 'Board' },
      ],
    },
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

describe('ArtifactSpaceSchemaService', () => {
  it('creates a multi-select field with generated ids, options, and requested view visibility', async () => {
    const db = { spaces: [makeSpace()] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const result = (await handlers.create_space_field({
      space_id: 'space-1',
      name: 'Launch Tags',
      type: 'multi_select',
      options: [{ label: 'Hot' }, { id: 'warm-lead', label: 'Warm', color: 'orange' }],
      visible_in_view_ids: ['list', 'board'],
    })) as any

    expect(result.success).toBe(true)
    expect(result.field).toMatchObject({
      id: 'launch_tags',
      name: 'Launch Tags',
      type: 'multi_select',
      options: [
        { id: 'hot', label: 'Hot', color: 'purple' },
        { id: 'warm-lead', label: 'Warm', color: 'orange' },
      ],
    })
    expect(db.spaces[0].schema.fields).toContainEqual(result.field)
    expect(db.spaces[0].schema.views[0].visible_fields).toEqual(['status', 'title', 'launch_tags'])
    expect(db.spaces[0].schema.views[1].visible_fields).toEqual(['launch_tags'])
  })

  it('suffixes implicit ids when the slug already exists', async () => {
    const space = makeSpace()
    space.schema.fields.push({ id: 'launch_tags', name: 'Launch Tags', type: 'text' })
    const db = { spaces: [space] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const result = (await handlers.create_space_field({
      space_id: 'space-1',
      name: 'Launch Tags',
      type: 'text',
    })) as any

    expect(result.success).toBe(true)
    expect(result.field.id).toBe('launch_tags_2')
  })

  it('rejects explicit field id conflicts', async () => {
    const db = { spaces: [makeSpace()] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const result = (await handlers.create_space_field({
      space_id: 'space-1',
      field_id: 'status',
      name: 'Status',
      type: 'select',
    })) as any

    expect(result).toMatchObject({ success: false })
    expect(result.error).toMatch(/already exists/i)
  })

  it('rejects unsupported and system-only create types', async () => {
    const db = { spaces: [makeSpace()] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const result = (await handlers.create_space_field({
      space_id: 'space-1',
      name: 'Created',
      type: 'created_at',
    })) as any

    expect(result).toMatchObject({ success: false })
    expect(result.error).toMatch(/unsupported field type/i)
  })

  it('rejects options on non-select fields and empty option labels', async () => {
    const db = { spaces: [makeSpace()] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const textResult = (await handlers.create_space_field({
      space_id: 'space-1',
      name: 'Source',
      type: 'text',
      options: [{ label: 'Organic' }],
    })) as any
    const selectResult = (await handlers.create_space_field({
      space_id: 'space-1',
      name: 'Source',
      type: 'select',
      options: [{ label: '' }],
    })) as any

    expect(textResult.error).toMatch(/only valid for select/i)
    expect(selectResult.error).toMatch(/option label/i)
  })

  it('renames non-system fields, rejects system renames, and replaces select options', async () => {
    const space = makeSpace()
    space.schema.fields.push({
      id: 'source',
      name: 'Source',
      type: 'select',
      options: [{ id: 'old', label: 'Old', color: 'blue' }],
    })
    const db = { spaces: [space] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const renamed = (await handlers.update_space_field({
      space_id: 'space-1',
      field_id: 'source',
      name: 'Lead Source',
      options: [{ label: 'Organic' }, { label: 'Referral', color: 'green' }],
      visible_in_view_ids: ['list'],
    })) as any
    const systemRename = (await handlers.update_space_field({
      space_id: 'space-1',
      field_id: 'status',
      name: 'Stage',
    })) as any
    const systemOptions = (await handlers.update_space_field({
      space_id: 'space-1',
      field_id: 'status',
      options: [{ id: 'todo', label: 'To Do', color: 'cyan' }],
    })) as any

    expect(renamed.success).toBe(true)
    expect(renamed.field).toMatchObject({
      id: 'source',
      name: 'Lead Source',
      type: 'select',
      options: [
        { id: 'organic', label: 'Organic', color: 'purple' },
        { id: 'referral', label: 'Referral', color: 'green' },
      ],
    })
    expect(db.spaces[0].schema.views[0].visible_fields).toContain('source')
    expect(systemRename).toMatchObject({ success: false })
    expect(systemRename.error).toMatch(/system fields cannot be renamed/i)
    expect(systemOptions).toMatchObject({ success: true })
  })

  it('appends field options without replacing existing options', async () => {
    const db = { spaces: [makeSpace()] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const result = (await handlers.append_space_field_option({
      space_id: 'space-1',
      field_id: 'status',
      label: 'Research',
      color: 'violet',
    })) as any

    expect(result.success).toBe(true)
    expect(result.option).toEqual({ id: 'research', label: 'Research', color: 'violet' })
    expect(result.field.options).toEqual([
      { id: 'todo', label: 'To Do', color: 'cyan' },
      { id: 'research', label: 'Research', color: 'violet' },
    ])
  })

  it('treats duplicate option ids as idempotent appends', async () => {
    const db = { spaces: [makeSpace()] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const result = (await handlers.append_space_field_option({
      space_id: 'space-1',
      field_id: 'status',
      id: 'todo',
      label: 'To Do',
    })) as any

    expect(result.success).toBe(true)
    expect(result.existing).toBe(true)
    expect(result.field.options).toEqual([{ id: 'todo', label: 'To Do', color: 'cyan' }])
  })

  it('adds status, tag, and category options through dedicated helpers', async () => {
    const db = { spaces: [makeSpace()] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const status = (await handlers.create_space_status({
      space_id: 'space-1',
      label: 'Research',
    })) as any
    const tag = (await handlers.create_space_tag({
      space_id: 'space-1',
      label: 'Urgent',
      color: 'red',
    })) as any
    const category = (await handlers.create_space_category({
      space_id: 'space-1',
      label: 'Content',
      color: 'green',
    })) as any

    expect(status.field.id).toBe('status')
    expect(status.option).toMatchObject({ id: 'research', label: 'Research' })
    expect(tag.field.id).toBe('tags')
    expect(tag.option).toEqual({ id: 'urgent', label: 'Urgent', color: 'red' })
    expect(category.field).toMatchObject({ id: 'category', name: 'Category', type: 'select' })
    expect(category.option).toEqual({ id: 'content', label: 'Content', color: 'green' })
  })

  it('creates and updates views without changing existing views', async () => {
    const db = { spaces: [makeSpace()] }
    const handlers = new ArtifactSpaceSchemaService().getHandlers(makeTarget(db))

    const created = (await handlers.create_space_view({
      space_id: 'space-1',
      name: 'Research Board',
      view_type: 'kanban',
      visible_field_ids: ['status', 'title', 'tags'],
      config: { group_by: 'status' },
    })) as any
    const updated = (await handlers.update_space_view({
      space_id: 'space-1',
      view_id: 'research_board',
      name: 'Research Pipeline',
      visible_field_ids: ['status', 'title'],
    })) as any

    expect(created.success).toBe(true)
    expect(created.view).toMatchObject({
      id: 'research_board',
      name: 'Research Board',
      type: 'kanban',
      visible_fields: ['status', 'title', 'tags'],
      config: { group_by: 'status' },
    })
    expect(updated.view).toMatchObject({
      id: 'research_board',
      name: 'Research Pipeline',
      type: 'kanban',
      visible_fields: ['status', 'title'],
    })
    expect(db.spaces[0].schema.views.map((view: any) => view.id)).toEqual([
      'list',
      'board',
      'research_board',
    ])
  })
})
