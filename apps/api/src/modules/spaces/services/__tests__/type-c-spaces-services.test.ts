import { describe, expect, it, vi } from 'vitest'
import { SpacesRepository } from '../../repositories/spaces.repository'
import { SpacePublicShareResolverService } from '../space-public-share-resolver.service'
import { SpaceShareManagementService } from '../space-share-management.service'
import { SpacesService } from '../spaces.service'

type Row = Record<string, any>

class FakeQuery {
  private action: 'select' | 'update' | 'insert' | 'delete' = 'select'
  private filters: Array<(row: Row) => boolean> = []
  private updatePayload: Row = {}
  private insertPayload: Row | Row[] | null = null

  constructor(
    private readonly db: Record<string, Row[]>,
    private readonly table: string,
  ) {}

  select(_columns = '*') {
    if (this.action !== 'update' && this.action !== 'insert' && this.action !== 'delete') {
      this.action = 'select'
    }
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

  order() {
    return this
  }

  private matchingRows() {
    return [...(this.db[this.table] ?? [])].filter((row) =>
      this.filters.every((filter) => filter(row)),
    )
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
      const row = this.matchingRows()[0]
      if (!row) return { data: null, error: { message: 'not found' } }
      Object.assign(row, this.updatePayload)
      return { data: row, error: null }
    }
    return { data: this.matchingRows()[0] ?? null, error: null }
  }

  then(resolve: (value: { data?: Row[]; error: null }) => void) {
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
      this.db[this.table] = (this.db[this.table] ?? []).filter(
        (row) => !this.filters.every((filter) => filter(row)),
      )
      return Promise.resolve(resolve({ data: [], error: null }))
    }
    return Promise.resolve(resolve({ data: this.matchingRows(), error: null }))
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

function spacesService() {
  return new SpacesService(
    new SpacesRepository(),
    { assertCanAccessItem: vi.fn().mockResolvedValue('edit') } as never,
    { evaluate: vi.fn().mockResolvedValue(undefined) } as never,
    {} as never,
    {} as never,
    {} as never,
    { dispatch: vi.fn() } as never,
    { indexSource: vi.fn(), deleteSource: vi.fn() } as never,
  )
}

describe('Spaces Type C service behavior', () => {
  it('creates email item invites with normalized email and replaces prior invite rows', async () => {
    const db = {
      space_items: [{ id: 'item-1', space_id: 'space-1', org_id: 'org-1', user_id: 'owner-1' }],
      space_item_shares: [
        {
          id: 'old-share',
          space_id: 'space-1',
          item_id: 'item-1',
          org_id: 'org-1',
          entity_type: 'email',
          invited_email: 'friend@example.com',
        },
      ],
    }

    const share = await new SpaceShareManagementService().createItemEmailInvite(
      fakeSupabase(db),
      'user-1',
      'space-1',
      'item-1',
      '  Friend@Example.COM ',
      'edit',
      'org-1',
    )

    expect(db.space_item_shares).toHaveLength(1)
    expect(db.space_item_shares[0]!.id).not.toBe('old-share')
    expect(share).toEqual(
      expect.objectContaining({
        item_id: 'item-1',
        space_id: 'space-1',
        org_id: 'org-1',
        entity_type: 'email',
        invited_email: 'friend@example.com',
        level: 'edit',
        inherit_to_children: true,
        created_by: 'user-1',
      }),
    )
    expect(typeof share.invite_token).toBe('string')
    expect(typeof share.invite_expires_at).toBe('string')
  })

  it('resolves email invite tokens and only exposes doc custom-data flags', async () => {
    const db = {
      space_items: [
        {
          id: 'item-1',
          space_id: 'space-1',
          title: 'Shared doc',
          status: 'todo',
          custom_data: { _doc_source: 'studio', private_flag: true },
        },
      ],
      space_item_shares: [
        {
          invite_token: 'invite-token',
          entity_type: 'email',
          item_id: 'item-1',
          space_id: 'space-1',
          level: 'edit',
          invite_expires_at: '2099-01-01T00:00:00Z',
        },
      ],
      spaces: [{ id: 'space-1', title: 'Shared space', visibility: 'private' }],
    }

    const shared = await new SpacePublicShareResolverService().resolveSharedItemByToken(
      fakeSupabase(db),
      'invite-token',
    )

    expect(shared).toEqual(
      expect.objectContaining({
        share_type: 'invite',
        access_level: 'edit',
        space: expect.objectContaining({ id: 'space-1' }),
        item: expect.objectContaining({
          id: 'item-1',
          custom_data: { _doc_source: 'studio' },
        }),
      }),
    )
  })

  it('accepts agent suggestions, updates the item, and records activity', async () => {
    const db = {
      space_items: [
        {
          id: 'item-1',
          space_id: 'space-1',
          source: 'agent_suggested',
          suggestion_state: null,
        },
      ],
      space_item_activity: [],
    }

    const accepted = await spacesService().acceptSuggestion(
      fakeSupabase(db),
      'user-1',
      'space-1',
      'item-1',
      null,
      null,
    )
    await Promise.resolve()

    expect(accepted).toEqual(
      expect.objectContaining({ id: 'item-1', suggestion_state: 'accepted' }),
    )
    expect(db.space_items[0]!.suggestion_state).toBe('accepted')
    expect(db.space_item_activity[0]).toEqual(
      expect.objectContaining({
        item_id: 'item-1',
        space_id: 'space-1',
        user_id: 'user-1',
        event_type: 'field_change',
        payload: { field: 'suggestion_state', from: null, to: 'accepted' },
      }),
    )
  })
})
