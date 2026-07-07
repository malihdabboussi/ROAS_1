import { vi } from 'vitest'

export type Row = Record<string, any>
type FilterFn = (row: Row) => boolean

export const NOW = '2026-06-08T10:00:00.000Z'

function readColumn(row: Row, column: string): unknown {
  if (column.includes('->>')) {
    const [root, key] = column.split('->>')
    const value = row[root]
    return value && typeof value === 'object' ? String(value[key] ?? '') : ''
  }
  // Embedded-resource path (e.g. 'contact_campaign_memberships.campaign_id'):
  // seed rows with the embed as a nested object or array of objects.
  if (column.includes('.')) {
    const [root, key] = column.split('.')
    const value = row[root!]
    if (Array.isArray(value)) return value.map((entry) => (entry as Row | null)?.[key!])
    if (value && typeof value === 'object') return (value as Row)[key!]
    return undefined
  }
  return row[column]
}

function columnMatches(row: Row, column: string, predicate: (v: unknown) => boolean): boolean {
  const value = readColumn(row, column)
  if (Array.isArray(value) && column.includes('.')) return value.some(predicate)
  return predicate(value)
}

function objectContains(rowValue: unknown, expected: Record<string, unknown>): boolean {
  if (!rowValue || typeof rowValue !== 'object') return false
  return Object.entries(expected).every(([key, value]) => (rowValue as Row)[key] === value)
}

export class TableSupabaseHarness {
  readonly tables: Record<string, Row[]>
  readonly client: any
  /** Seed RPC results: handler may return rows or throw to simulate a DB error. */
  readonly rpcHandlers = new Map<string, (params: Record<string, unknown>) => unknown>()
  private counters = new Map<string, number>()

  constructor(seed: Record<string, Row[]> = {}) {
    this.tables = {
      agent_channels: [],
      channel_members: [],
      contacts: [],
      contact_identifiers: [],
      conversations: [],
      campaigns: [],
      contact_campaign_memberships: [],
      ...seed,
    }
    this.client = {
      from: vi.fn((table: string) => new TableQuery(this, table)),
      rpc: vi.fn(async (name: string, params: Record<string, unknown> = {}) => {
        const handler = this.rpcHandlers.get(name)
        if (!handler) return { data: null, error: { message: `RPC ${name} not seeded` } }
        try {
          return { data: handler(params), error: null }
        } catch (err) {
          return { data: null, error: { message: (err as Error).message } }
        }
      }),
    }
  }

  table(name: string): Row[] {
    if (!this.tables[name]) this.tables[name] = []
    return this.tables[name]
  }

  nextId(table: string): string {
    const next = (this.counters.get(table) ?? 0) + 1
    this.counters.set(table, next)
    return `${table}-${next}`
  }
}

class TableQuery {
  private filters: FilterFn[] = []
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: Row | Row[] | null = null
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitTo: number | null = null
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private conflictKeys: string[] = []

  constructor(
    private readonly harness: TableSupabaseHarness,
    private readonly tableName: string,
  ) {}

  select() {
    return this
  }

  insert(payload: Row | Row[]) {
    this.op = 'insert'
    this.payload = payload
    return this
  }

  update(payload: Row) {
    this.op = 'update'
    this.payload = payload
    return this
  }

  upsert(payload: Row | Row[], options?: { onConflict?: string }) {
    this.op = 'upsert'
    this.payload = payload
    this.conflictKeys = options?.onConflict?.split(',').map((key) => key.trim()) ?? []
    return this
  }

  delete() {
    this.op = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => columnMatches(row, column, (v) => v === value))
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => !columnMatches(row, column, (v) => v === value))
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push((row) => columnMatches(row, column, (v) => v === value))
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => columnMatches(row, column, (v) => values.includes(v)))
    return this
  }

  ilike(column: string, pattern: string) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i')
    this.filters.push((row) =>
      columnMatches(row, column, (v) => typeof v === 'string' && re.test(v)),
    )
    return this
  }

  not(column: string, op: string, value: unknown) {
    if (op === 'is') {
      this.filters.push((row) => readColumn(row, column) !== value)
    } else if (op === 'in' && typeof value === 'string') {
      const values = value
        .replace(/[()"]/g, '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
      this.filters.push((row) => !columnMatches(row, column, (v) => values.includes(String(v))))
    }
    return this
  }

  or(expression: string) {
    const parts = expression.split(',')
    this.filters.push((row) =>
      parts.some((part) => {
        const [column, op, value] = part.split('.')
        if (op === 'is') return readColumn(row, column) === null
        if (op === 'neq') return readColumn(row, column) !== value
        return false
      }),
    )
    return this
  }

  contains(column: string, value: Record<string, unknown>) {
    this.filters.push((row) => objectContains(readColumn(row, column), value))
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(count: number) {
    this.limitTo = count
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  async maybeSingle() {
    const result = this.execute()
    return { ...result, data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data }
  }

  async single() {
    const result = this.execute()
    return { ...result, data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data }
  }

  then(
    resolve: (value: { data: unknown; error: null; count?: number }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) {
    return Promise.resolve(this.execute()).then(resolve, reject)
  }

  private execute(): { data: unknown; error: null; count?: number } {
    if (this.op === 'insert') return { data: this.insertRows(this.payload), error: null }
    if (this.op === 'upsert') return { data: this.upsertRows(this.payload), error: null }
    if (this.op === 'update') return { data: this.updateRows(), error: null }
    if (this.op === 'delete') return { data: this.deleteRows(), error: null }
    return { data: this.selectRows(), error: null, count: this.selectRows().length }
  }

  private selectRows(): Row[] {
    let rows = this.harness
      .table(this.tableName)
      .filter((row) => this.filters.every((filter) => filter(row)))
    if (this.orderBy) {
      const { column, ascending } = this.orderBy
      rows = [...rows].sort((a, b) => {
        const av = readColumn(a, column)
        const bv = readColumn(b, column)
        if (av === bv) return 0
        if (av == null) return ascending ? -1 : 1
        if (bv == null) return ascending ? 1 : -1
        return av > bv ? (ascending ? 1 : -1) : ascending ? -1 : 1
      })
    }
    if (this.rangeFrom !== null && this.rangeTo !== null) {
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1)
    }
    if (this.limitTo !== null) rows = rows.slice(0, this.limitTo)
    return rows.map((row) => ({ ...row }))
  }

  private insertRows(payload: Row | Row[] | null): Row[] {
    const rows = Array.isArray(payload) ? payload : payload ? [payload] : []
    const inserted = rows.map((row) => ({
      id: row.id ?? this.harness.nextId(this.tableName),
      ...(this.tableName === 'conversations' ? { status: 'active' } : {}),
      created_at: row.created_at ?? NOW,
      updated_at: row.updated_at ?? NOW,
      ...row,
    }))
    this.harness.table(this.tableName).push(...inserted)
    return inserted.map((row) => ({ ...row }))
  }

  private upsertRows(payload: Row | Row[] | null): Row[] {
    const rows = Array.isArray(payload) ? payload : payload ? [payload] : []
    const table = this.harness.table(this.tableName)
    const upserted: Row[] = []

    for (const row of rows) {
      const existing = table.find((candidate) =>
        this.conflictKeys.every((key) => candidate[key] === row[key]),
      )
      if (existing) {
        Object.assign(existing, row, { updated_at: NOW })
        upserted.push({ ...existing })
      } else {
        const inserted = {
          id: row.id ?? this.harness.nextId(this.tableName),
          created_at: row.created_at ?? NOW,
          updated_at: row.updated_at ?? NOW,
          ...row,
        }
        table.push(inserted)
        upserted.push({ ...inserted })
      }
    }
    return upserted
  }

  private updateRows(): Row[] {
    const payload = (this.payload ?? {}) as Row
    const rows = this.harness
      .table(this.tableName)
      .filter((row) => this.filters.every((filter) => filter(row)))
    rows.forEach((row) => Object.assign(row, payload, { updated_at: NOW }))
    return rows.map((row) => ({ ...row }))
  }

  private deleteRows(): Row[] {
    const table = this.harness.table(this.tableName)
    const removed: Row[] = []
    for (let i = table.length - 1; i >= 0; i--) {
      if (this.filters.every((filter) => filter(table[i]))) {
        removed.push(...table.splice(i, 1))
      }
    }
    return removed
  }
}
