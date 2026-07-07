import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { SpacesRepository } from '../../repositories/spaces.repository'
import { SocialResearchFavoritesService } from '../social-research-favorites.service'
import { SpacesService } from '../spaces.service'
import { automationsRepoFromRepo } from './space-automation-test-utils'

type Row = Record<string, any>

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

  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value)
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  contains(column: string, expected: Row) {
    this.filters.push((row) => {
      const actual = row[column]
      return (
        actual &&
        typeof actual === 'object' &&
        Object.entries(expected).every(([key, value]) => actual[key] === value)
      )
    })
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

  async single() {
    const result = this.apply()
    return { data: Array.isArray(result.data) ? result.data[0] : result.data, error: null }
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
      const inserted = rows.map((row) => ({
        id: row?.id ?? `${this.table}_${this.db[this.table]!.length + 1}`,
        ...(row ?? {}),
      }))
      this.db[this.table]!.push(...inserted)
      return { data: inserted, error: null }
    }
    if (this.action === 'upsert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload]
      const upserted: Row[] = []
      for (const row of rows) {
        if (!row) continue
        const existing = this.db[this.table]!.find((candidate) => {
          if (row.id) return candidate.id === row.id
          if (row.user_id && row.space_id) {
            return candidate.user_id === row.user_id && candidate.space_id === row.space_id
          }
          return false
        })
        if (existing) {
          Object.assign(existing, row)
          upserted.push(existing)
        } else {
          const inserted = { id: `${this.table}_${this.db[this.table]!.length + 1}`, ...row }
          this.db[this.table]!.push(inserted)
          upserted.push(inserted)
        }
      }
      return { data: upserted, error: null }
    }
    if (this.action === 'update') {
      const updated = this.rows()
      for (const row of updated) Object.assign(row, this.payload ?? {})
      return { data: updated, error: null }
    }
    if (this.action === 'delete') {
      const deleted = this.rows()
      this.db[this.table] = this.db[this.table]!.filter((row) => !deleted.includes(row))
      return { data: deleted, error: null }
    }
    return { data: this.rows(), error: null }
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

function spacesService(overrides: Partial<ConstructorParameters<typeof SpacesService>> = {}) {
  return new SpacesService(
    overrides[0] ?? new SpacesRepository(),
    overrides[1] ?? ({ assertCanAccessItem: vi.fn().mockResolvedValue('edit') } as never),
    overrides[2] ?? (null as never),
    overrides[3] ?? ({ invoke: vi.fn() } as never),
    overrides[4] ?? ({} as never),
    overrides[5] ?? ({} as never),
    overrides[6] ?? ({ dispatch: vi.fn() } as never),
    overrides[7] ?? ({ indexSource: vi.fn(), deleteSource: vi.fn() } as never),
  )
}

describe('Type C Spaces service batch 3 baselines', () => {
  it('manages social research favorite folders without changing folder payloads', async () => {
    const db = {
      space_favorite_folders: [
        { id: 'folder_1', space_id: 'space_1', name: 'Keepers', created_at: '2026-01-01' },
      ],
    }
    const service = new SocialResearchFavoritesService()
    const supabase = fakeSupabase(db)

    await expect(service.listFolders({ supabase, spaceId: 'space_1' })).resolves.toEqual([
      { id: 'folder_1', space_id: 'space_1', name: 'Keepers', created_at: '2026-01-01' },
    ])

    const created = await service.createFolder({
      supabase,
      userId: 'user_1',
      orgId: 'org_1',
      spaceId: 'space_1',
      name: '  Winners  ',
    })
    expect(created).toEqual(
      expect.objectContaining({
        user_id: 'user_1',
        org_id: 'org_1',
        space_id: 'space_1',
        name: 'Winners',
      }),
    )

    await service.renameFolder({
      supabase,
      spaceId: 'space_1',
      folderId: 'folder_1',
      name: ' Reference ',
    })
    expect(db.space_favorite_folders[0]!.name).toBe('Reference')
    expect(db.space_favorite_folders[0]!.updated_at).toEqual(expect.any(String))

    await service.deleteFolder({ supabase, spaceId: 'space_1', folderId: 'folder_1' })
    expect(db.space_favorite_folders.some((folder) => folder.id === 'folder_1')).toBe(false)
  })

  it('persists personal space user state by user and space', async () => {
    const db = {
      space_user_state: [
        {
          user_id: 'user_1',
          space_id: 'space_1',
          is_favorite: true,
          is_hidden: false,
          updated_at: '2026-01-01',
        },
      ],
    }
    const service = spacesService()
    const supabase = fakeSupabase(db)

    await expect(service.listUserState(supabase, 'user_1')).resolves.toEqual([
      expect.objectContaining({ space_id: 'space_1', is_favorite: true }),
    ])

    await expect(
      service.upsertUserState(supabase, 'user_1', 'space_2', { is_hidden: true }),
    ).resolves.toEqual(expect.objectContaining({ space_id: 'space_2', is_hidden: true }))
    expect(db.space_user_state).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_id: 'user_1', space_id: 'space_2', is_hidden: true }),
      ]),
    )
  })

  it('creates the general campaign before creating the general space', async () => {
    const db = { campaigns: [], spaces: [] }
    const service = spacesService()
    const supabase = fakeSupabase(db)

    const space = await service.ensureGeneral(supabase, 'user_1', null)

    expect(db.campaigns[0]).toEqual(
      expect.objectContaining({
        user_id: 'user_1',
        org_id: null,
        name: 'General',
        config: expect.objectContaining({ system_kind: 'general' }),
      }),
    )
    expect(space).toEqual(expect.objectContaining({ campaign_id: db.campaigns[0]!.id }))
    expect(db.spaces[0]).toEqual(expect.objectContaining({ campaign_id: db.campaigns[0]!.id }))
  })

  it('marks a doc item visual as generating before invoking the visual agent', async () => {
    const db = {
      space_items: [
        {
          id: 'item_1',
          space_id: 'space_1',
          title: 'Doc',
          custom_data: { _view_type: 'doc' },
        },
      ],
      spaces: [{ id: 'space_1', user_id: 'user_1', org_id: null, campaign_id: 'campaign_1' }],
    }
    const userAgentApi = {
      invoke: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ visual: true }),
      }),
    }
    const service = spacesService({ 3: userAgentApi as never })
    const supabase = fakeSupabase(db)

    await expect(
      service.visualizeDocItem(supabase, 'user_1', 'space_1', 'item_1', {}, null, null),
    ).resolves.toEqual({ visual: true })

    expect(db.space_items[0]!.custom_data).toEqual(
      expect.objectContaining({
        _view_type: 'doc',
        _doc_visual_status: 'generating',
        _doc_visual_last_error: null,
      }),
    )
    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'user_1',
      '/api/artifacts',
      expect.objectContaining({
        method: 'POST',
      }),
      expect.objectContaining({ timeoutMs: 600_000 }),
    )
  })

  it('enriches recent automation runs with space and automation labels', async () => {
    const db = {
      space_automation_runs: [
        {
          id: 'run_1',
          user_id: 'user_1',
          org_id: null,
          space_id: 'space_1',
          item_id: 'item_1',
          automation_id: 'automation_1',
          status: 'success',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      spaces: [{ id: 'space_1', title: 'Launch board', campaign_id: 'campaign_1' }],
      space_automations: [{ id: 'automation_1', name: 'Follow up' }],
    }
    const service = spacesService()
    const supabase = fakeSupabase(db)

    await expect(
      service.listRecentCompletedAutomationRuns(
        supabase,
        { campaign_id: 'campaign_1', mine_only: true, limit: 10 },
        null,
        'user_1',
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'run_1',
        automation_name: 'Follow up',
        space_title: 'Launch board',
      }),
    ])
  })

  it('resumes paused automation runs from stored run state', async () => {
    const runState = {
      id: 'run_state_1',
      status: 'paused',
      automation_id: 'automation_1',
      trigger_event: { type: 'task_created' },
      next_action_index: 1,
      actions_executed: [{ type: 'send_to_agent', result: 'ok' }],
    }
    const db = {
      space_automation_run_state: [runState],
      space_automation_runs: [],
    }
    const repo = {
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_1',
              name: 'Resume',
              enabled: true,
              trigger: { type: 'task_created' },
              actions: [{ type: 'send_to_agent' }, { type: 'change_status', status: 'done' }],
            },
          ],
        },
      }),
      findItemById: vi.fn().mockResolvedValue({ id: 'item_1', title: 'Task', custom_data: {} }),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
      updateItem: vi.fn().mockResolvedValue({ id: 'item_1', status: 'done' }),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )
    const supabase = fakeSupabase(db)

    await service.resumeAutomation(
      {
        supabase,
        userId: 'user_1',
        orgId: null,
        spaceId: 'space_1',
        itemId: 'item_1',
        depth: 0,
      },
      'run_state_1',
      'done',
    )

    expect(db.space_automation_run_state[0]!.status).toBe('resumed')
    expect(repo.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      'space_1',
      'item_1',
      { status: 'done' },
      null,
    )
  })
})
