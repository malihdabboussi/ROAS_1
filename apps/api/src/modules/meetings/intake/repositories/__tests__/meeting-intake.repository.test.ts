import { beforeEach, describe, expect, it } from 'vitest'
import { MeetingIntakeRepository } from '../meeting-intake.repository'

type Row = Record<string, unknown> & { id: string }

/**
 * A tiny in-memory stand-in for the Supabase query builder, covering only
 * what the repository uses on `user_integrations`: select/eq/is/order/limit,
 * insert, update, maybeSingle and awaiting the builder itself.
 */
function fakeClient(rows: Row[]) {
  let nextId = 100
  const table = () => {
    const filters: Array<(row: Row) => boolean> = []
    let mode: 'select' | 'update' | 'insert' = 'select'
    let patch: Record<string, unknown> = {}
    let orderKey: string | null = null
    let orderAsc = true
    let limitTo: number | null = null
    const matches = () => rows.filter((row) => filters.every((f) => f(row)))
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (col: string, value: unknown) => {
        filters.push((row) => row[col] === value)
        return builder
      },
      is: (col: string, value: unknown) => {
        filters.push((row) => (row[col] ?? null) === value)
        return builder
      },
      order: (col: string, opts: { ascending?: boolean }) => {
        orderKey = col
        orderAsc = opts?.ascending !== false
        return builder
      },
      limit: (n: number) => {
        limitTo = n
        return builder
      },
      update: (values: Record<string, unknown>) => {
        mode = 'update'
        patch = values
        return builder
      },
      insert: (values: Record<string, unknown>) => {
        mode = 'insert'
        rows.push({ ...values, id: `row_${nextId++}` } as Row)
        return { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }) }
      },
      maybeSingle: async () => {
        const found = matches()
        if (found.length > 1) return { data: null, error: { message: 'multiple rows' } }
        return { data: found[0] ?? null, error: null }
      },
      then: (resolve: (v: unknown) => unknown) => {
        if (mode === 'update') {
          for (const row of matches()) Object.assign(row, patch)
          return resolve({ data: null, error: null })
        }
        let found = matches()
        if (orderKey) {
          const key = orderKey
          found = [...found].sort((a, b) =>
            String(a[key]) < String(b[key]) ? (orderAsc ? -1 : 1) : orderAsc ? 1 : -1,
          )
        }
        if (limitTo !== null) found = found.slice(0, limitTo)
        return resolve({ data: found, error: null })
      },
    }
    return builder
  }
  return { from: () => table() }
}

const KEY_A = 'A'.repeat(32)
const KEY_B = 'B'.repeat(32)

describe('MeetingIntakeRepository pasted-webhook rows', () => {
  let rows: Row[]
  let repo: MeetingIntakeRepository

  beforeEach(() => {
    rows = []
    repo = new MeetingIntakeRepository({ client: fakeClient(rows) } as never)
  })

  it('mints one key on a pending row and keeps it through connect', async () => {
    await repo.ensurePendingWebhookConnection('read_ai', 'u1', { connectionLabel: 'Read AI' })
    const key = await repo.ensureWebhookKey('read_ai', 'u1')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.status).toBe('pending')
    await expect(repo.ensureWebhookKey('read_ai', 'u1')).resolves.toBe(key)

    await repo.upsertPastedWebhookConnection('read_ai', 'u1', { connectionLabel: 'Read AI' })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.status).toBe('connected')
    expect((rows[0]!.metadata as Record<string, unknown>).webhook_key).toBe(key)
    await expect(repo.ensureWebhookKey('read_ai', 'u1')).resolves.toBe(key)
  })

  it('collapses duplicate rows on connect, keeping the connected row and its key', async () => {
    rows.push(
      {
        id: 'old',
        user_id: 'u1',
        integration_id: 'read_ai',
        org_id: null,
        status: 'pending',
        metadata: { webhook_key: KEY_B },
        updated_at: '2026-09-14T10:00:00Z',
      },
      {
        id: 'live',
        user_id: 'u1',
        integration_id: 'read_ai',
        org_id: null,
        status: 'connected',
        metadata: { webhook_key: KEY_A },
        updated_at: '2026-09-14T09:00:00Z',
      },
      {
        id: 'dup',
        user_id: 'u1',
        integration_id: 'read_ai',
        org_id: null,
        status: 'pending',
        metadata: {},
        updated_at: '2026-09-14T11:00:00Z',
      },
    )
    await expect(repo.ensureWebhookKey('read_ai', 'u1')).resolves.toBe(KEY_A)
    await repo.upsertPastedWebhookConnection('read_ai', 'u1', { connectionLabel: 'Read AI' })
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
    expect(byId.live!.status).toBe('connected')
    expect((byId.live!.metadata as Record<string, unknown>).webhook_key).toBe(KEY_A)
    expect(byId.old!.status).toBe('disconnected')
    expect(byId.old!.metadata).toEqual({})
    expect(byId.dup!.status).toBe('disconnected')
    expect(rows).toHaveLength(3)
    await expect(repo.ensureWebhookKey('read_ai', 'u1')).resolves.toBe(KEY_A)
  })

  it('does not add a row when duplicates already exist, and disconnect keeps the key once', async () => {
    rows.push(
      {
        id: 'p1',
        user_id: 'u1',
        integration_id: 'read_ai',
        org_id: null,
        status: 'pending',
        metadata: { webhook_key: KEY_A },
        updated_at: '2026-09-14T10:00:00Z',
      },
      {
        id: 'p2',
        user_id: 'u1',
        integration_id: 'read_ai',
        org_id: null,
        status: 'pending',
        metadata: { webhook_key: KEY_A },
        updated_at: '2026-09-14T11:00:00Z',
      },
    )
    await repo.ensurePendingWebhookConnection('read_ai', 'u1', { connectionLabel: 'Read AI' })
    expect(rows).toHaveLength(2)
    await repo.markPastedWebhookDisconnected('read_ai', 'u1')
    const withKey = rows.filter(
      (r) => (r.metadata as Record<string, unknown>).webhook_key === KEY_A,
    )
    expect(withKey).toHaveLength(1)
    expect(rows.every((r) => r.status === 'disconnected')).toBe(true)
  })

  it('ignores other users and other providers', async () => {
    rows.push({
      id: 'x',
      user_id: 'u2',
      integration_id: 'read_ai',
      org_id: null,
      status: 'connected',
      metadata: { webhook_key: KEY_B },
      updated_at: '2026-09-14T10:00:00Z',
    })
    await repo.ensurePendingWebhookConnection('read_ai', 'u1', { connectionLabel: 'Read AI' })
    const key = await repo.ensureWebhookKey('read_ai', 'u1')
    expect(key).not.toBe(KEY_B)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.id === 'x')!.status).toBe('connected')
  })
})
