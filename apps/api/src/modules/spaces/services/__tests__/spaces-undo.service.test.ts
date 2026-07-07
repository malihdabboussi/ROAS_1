import { describe, expect, it, vi } from 'vitest'
import { SpacesUndoService } from '../spaces-undo.service'

type Row = Record<string, any>

class FakeQuery {
  private action: 'select' | 'update' | 'insert' | 'delete' = 'select'
  private filters: Array<(row: Row) => boolean> = []
  private updatePayload: Row = {}
  private insertPayload: Row | Row[] | null = null
  private orderSpec: { column: string; ascending: boolean } | null = null
  private selectHead = false

  constructor(
    private readonly db: Record<string, Row[]>,
    private readonly table: string,
  ) {}

  select(_columns = '*', opts?: { count?: 'exact'; head?: boolean }) {
    if (this.action !== 'update' && this.action !== 'insert' && this.action !== 'delete') {
      this.action = 'select'
    }
    this.selectHead = opts?.head === true
    return this
  }

  insert(payload: Row | Row[]) {
    this.action = 'insert'
    this.insertPayload = payload
    return this
  }

  update(payload: Row) {
    this.action = 'update'
    this.updatePayload = payload
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  order(column: string, opts: { ascending: boolean }) {
    this.orderSpec = { column, ascending: opts.ascending }
    return this
  }

  private matchingRows() {
    let rows = [...(this.db[this.table] ?? [])].filter((row) =>
      this.filters.every((filter) => filter(row)),
    )
    if (this.orderSpec) {
      const { column, ascending } = this.orderSpec
      rows = rows.sort((a, b) => {
        const left = String(a[column] ?? '')
        const right = String(b[column] ?? '')
        return ascending ? left.localeCompare(right) : right.localeCompare(left)
      })
    }
    return rows
  }

  async maybeSingle() {
    return { data: this.matchingRows()[0] ?? null, error: null }
  }

  async single() {
    if (this.action === 'insert') {
      const row = Array.isArray(this.insertPayload) ? this.insertPayload[0] : this.insertPayload
      const inserted = { id: row?.id ?? `row-${Date.now()}`, ...(row ?? {}) }
      this.db[this.table].push(inserted)
      return { data: inserted, error: null }
    }
    if (this.action === 'update') {
      const rows = this.matchingRows()
      const row = rows[0]
      if (!row) return { data: null, error: { message: 'not found' } }
      Object.assign(row, this.updatePayload)
      return { data: row, error: null }
    }
    return { data: this.matchingRows()[0] ?? null, error: null }
  }

  then(resolve: (value: { data?: Row[]; error: null; count?: number }) => void) {
    if (this.action === 'insert') {
      const rows = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload]
      for (const row of rows)
        this.db[this.table].push({ id: row?.id ?? `row-${Date.now()}`, ...row })
      return Promise.resolve(resolve({ data: rows as Row[], error: null }))
    }
    if (this.action === 'update') {
      for (const row of this.matchingRows()) Object.assign(row, this.updatePayload)
      return Promise.resolve(resolve({ data: this.matchingRows(), error: null }))
    }
    if (this.action === 'delete') {
      const remaining = (this.db[this.table] ?? []).filter(
        (row) => !this.filters.every((filter) => filter(row)),
      )
      this.db[this.table] = remaining
      return Promise.resolve(resolve({ data: [], error: null }))
    }
    const rows = this.matchingRows()
    return Promise.resolve(
      resolve({ data: this.selectHead ? [] : rows, error: null, count: rows.length }),
    )
  }
}

function fakeSupabase(db: Record<string, Row[]>) {
  return {
    from(table: string) {
      if (!db[table]) db[table] = []
      return new FakeQuery(db, table)
    },
  } as any
}

function service() {
  return new SpacesUndoService({
    assertCanAccessSpace: vi.fn().mockResolvedValue('edit'),
  } as any)
}

describe('SpacesUndoService', () => {
  it('undoes an agent status change when the current value still matches', async () => {
    const db = {
      space_items: [{ id: 'item-1', space_id: 'space-1', status: 'in_progress' }],
      space_item_activity: [
        {
          id: 'activity-1',
          item_id: 'item-1',
          space_id: 'space-1',
          user_id: 'user-1',
          org_id: null,
          actor_kind: 'agent',
          agent_message_id: '00000000-0000-4000-8000-000000000001',
          event_type: 'status_change',
          payload: { from: 'todo', to: 'in_progress' },
          snapshot: null,
          reverted_at: null,
          created_at: '2026-05-14T00:00:00Z',
        },
      ],
    }

    const result = await service().undoAgentTaskEdits(fakeSupabase(db), 'user-1', 'space-1', {
      agent_message_id: '00000000-0000-4000-8000-000000000001',
      direction: 'undo',
      mode: 'strict',
    })

    expect(result.undone).toBe(1)
    expect(db.space_items[0]!.status).toBe('todo')
    expect(db.space_item_activity[0]!.reverted_at).toBeTruthy()
  })

  it('skips strict undo when the user changed the value after the agent', async () => {
    const db = {
      space_items: [{ id: 'item-1', space_id: 'space-1', status: 'done' }],
      space_item_activity: [
        {
          id: 'activity-1',
          item_id: 'item-1',
          space_id: 'space-1',
          user_id: 'user-1',
          org_id: null,
          actor_kind: 'agent',
          agent_message_id: '00000000-0000-4000-8000-000000000001',
          event_type: 'status_change',
          payload: { from: 'todo', to: 'in_progress' },
          snapshot: null,
          reverted_at: null,
          created_at: '2026-05-14T00:00:00Z',
        },
      ],
    }

    const result = await service().undoAgentTaskEdits(fakeSupabase(db), 'user-1', 'space-1', {
      agent_message_id: '00000000-0000-4000-8000-000000000001',
      direction: 'undo',
      mode: 'strict',
    })

    expect(result.undone).toBe(0)
    expect(result.skipped[0]?.reason).toBe('superseded')
    expect(db.space_items[0]!.status).toBe('done')
  })

  it('redoes an agent status change after undo (strict)', async () => {
    const db = {
      space_items: [{ id: 'item-1', space_id: 'space-1', status: 'in_progress' }],
      space_item_activity: [
        {
          id: 'activity-1',
          item_id: 'item-1',
          space_id: 'space-1',
          user_id: 'user-1',
          org_id: null,
          actor_kind: 'agent',
          agent_message_id: '00000000-0000-4000-8000-000000000001',
          event_type: 'status_change',
          payload: { from: 'todo', to: 'in_progress' },
          snapshot: null,
          reverted_at: null,
          created_at: '2026-05-14T00:00:00Z',
        },
      ],
    }

    await service().undoAgentTaskEdits(fakeSupabase(db), 'user-1', 'space-1', {
      agent_message_id: '00000000-0000-4000-8000-000000000001',
      direction: 'undo',
      mode: 'strict',
    })
    expect(db.space_items[0]!.status).toBe('todo')
    expect(db.space_item_activity[0]!.reverted_at).toBeTruthy()

    const redoResult = await service().undoAgentTaskEdits(fakeSupabase(db), 'user-1', 'space-1', {
      agent_message_id: '00000000-0000-4000-8000-000000000001',
      direction: 'redo',
      mode: 'strict',
    })

    expect(redoResult.undone).toBe(1)
    expect(db.space_items[0]!.status).toBe('in_progress')
    expect(db.space_item_activity[0]!.reverted_at).toBeNull()
  })

  it('strict redo matches status when item has null-like vs empty-string activity from', async () => {
    const db = {
      space_items: [{ id: 'item-1', space_id: 'space-1', status: '' }],
      space_item_activity: [
        {
          id: 'activity-1',
          item_id: 'item-1',
          space_id: 'space-1',
          user_id: 'user-1',
          org_id: null,
          actor_kind: 'agent',
          agent_message_id: '00000000-0000-4000-8000-000000000001',
          event_type: 'status_change',
          payload: { from: '', to: 'in_progress' },
          snapshot: null,
          reverted_at: '2026-05-14T01:00:00Z',
          created_at: '2026-05-14T00:00:00Z',
        },
      ],
    }

    const redoResult = await service().undoAgentTaskEdits(fakeSupabase(db), 'user-1', 'space-1', {
      agent_message_id: '00000000-0000-4000-8000-000000000001',
      direction: 'redo',
      mode: 'strict',
    })
    expect(redoResult.undone).toBe(1)
    expect(db.space_items[0]!.status).toBe('in_progress')
  })
})
