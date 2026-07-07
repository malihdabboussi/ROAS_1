type Row = Record<string, unknown>

class FakeQuery {
  private action: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select'
  private filters: Array<(row: Row) => boolean> = []
  private payload: Row | Row[] | null = null
  private limitCount: number | null = null

  constructor(
    private readonly db: Record<string, Row[]>,
    private readonly table: string,
  ) {}

  select() {
    return this
  }

  insert(payload: Row | Row[]) {
    this.action = 'insert'
    this.payload = payload
    return this
  }

  upsert(payload: Row | Row[]) {
    this.action = 'upsert'
    this.payload = payload
    return this
  }

  update(payload: Row) {
    this.action = 'update'
    this.payload = payload
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

  is(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  order() {
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  async maybeSingle() {
    return { data: this.rows()[0] ?? null, error: null }
  }

  then(resolve: (value: { data: Row[]; error: null }) => void) {
    return Promise.resolve(resolve(this.apply()))
  }

  private rows() {
    const rows = [...(this.db[this.table] ?? [])].filter((row) =>
      this.filters.every((filter) => filter(row)),
    )
    return this.limitCount == null ? rows : rows.slice(0, this.limitCount)
  }

  private apply(): { data: Row[]; error: null } {
    if (!this.db[this.table]) this.db[this.table] = []
    if (this.action === 'insert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload]
      const inserted = rows
        .filter((row): row is Row => !!row)
        .map((row) => ({
          id: row.id ?? `${this.table}_${this.db[this.table]!.length + 1}`,
          ...row,
        }))
      this.db[this.table]!.push(...inserted)
      return { data: inserted, error: null }
    }
    if (this.action === 'update') {
      const updated: Row[] = []
      for (const row of this.db[this.table]!) {
        if (this.filters.every((filter) => filter(row))) {
          Object.assign(row, this.payload ?? {})
          updated.push(row)
        }
      }
      return { data: updated, error: null }
    }
    return { data: this.rows(), error: null }
  }
}

export function fakeSupabase(db: Record<string, Row[]>) {
  return {
    from(table: string) {
      if (!db[table]) db[table] = []
      return new FakeQuery(db, table)
    },
  } as never
}

export function automationsRepoFromRepo(repo: {
  findSpaceById?: (...args: unknown[]) => Promise<Record<string, unknown> | null>
}) {
  const readAutomations = async () => {
    const space = repo.findSpaceById ? await repo.findSpaceById() : null
    const schema = space?.schema as { automations?: unknown[] } | undefined
    return Array.isArray(schema?.automations) ? schema.automations : []
  }
  return {
    listBySpace: async () => readAutomations(),
    findById: async (_supabase: unknown, _spaceId: string, automationId: string) => {
      const automations = await readAutomations()
      return (
        (automations as Array<{ id?: string }>).find(
          (automation) => automation.id === automationId,
        ) ?? null
      )
    },
  }
}

export function emptyAutomationsRepo() {
  return {
    listBySpace: async () => [],
    findById: async () => null,
  }
}
