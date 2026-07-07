import { describe, expect, it, vi } from 'vitest'
import { ArtifactDocumentsService } from './artifact-documents.service'

function makeSupabase() {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = []

  const makeBuilder = (table: string) => {
    const filters = new Map<string, unknown>()
    const builder: Record<string, any> = {
      select: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: 'select', args })
        return builder
      }),
      eq: vi.fn((key: string, value: unknown) => {
        calls.push({ table, method: 'eq', args: [key, value] })
        filters.set(key, value)
        return builder
      }),
      is: vi.fn((key: string, value: unknown) => {
        calls.push({ table, method: 'is', args: [key, value] })
        filters.set(key, value)
        return builder
      }),
      in: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: 'in', args })
        return builder
      }),
      ilike: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: 'ilike', args })
        return builder
      }),
      order: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: 'order', args })
        return builder
      }),
      limit: vi.fn((...args: unknown[]) => {
        calls.push({ table, method: 'limit', args })
        return builder
      }),
      maybeSingle: vi.fn(async () => {
        calls.push({ table, method: 'maybeSingle', args: [] })
        if (table === 'conversation_documents' && filters.get('id') === 'doc-1') {
          return {
            data: {
              id: 'doc-1',
              conversation_id: 'conversation-1',
              campaign_id: 'campaign-1',
              title: 'Hadassah Cyprus',
              content: '# Draft',
            },
            error: null,
          }
        }
        return { data: null, error: null }
      }),
      then: (
        resolve?: ((value: { data: unknown[]; error: null }) => unknown) | null,
        reject?: ((reason: unknown) => unknown) | null,
      ) => {
        return Promise.resolve(resolveRows(table)).then(resolve, reject)
      },
    }
    return builder
  }

  const resolveRows = (table: string) => {
    if (table === 'spaces') return { data: [{ id: 'space-1' }], error: null }
    if (table === 'space_items') {
      return {
        data: [
          {
            id: 'space-doc-1',
            space_id: 'space-1',
            title: 'Campaign Plan',
            parent_item_id: null,
            doc_body: '<p>Plan</p>',
            notes: null,
            custom_data: { _view_type: 'doc' },
            created_at: '2026-05-27T10:00:00.000Z',
            updated_at: '2026-05-27T10:00:00.000Z',
          },
        ],
        error: null,
      }
    }
    if (table === 'conversation_documents') {
      return {
        data: [
          {
            id: 'doc-1',
            conversation_id: 'conversation-1',
            campaign_id: 'campaign-1',
            title: 'Hadassah Cyprus',
            content: '# Draft',
            created_at: '2026-05-27T10:00:00.000Z',
          },
        ],
        error: null,
      }
    }
    return { data: [], error: null }
  }

  return {
    calls,
    client: {
      from: vi.fn((table: string) => {
        calls.push({ table, method: 'from', args: [table] })
        return makeBuilder(table)
      }),
    },
  }
}

function makeTarget(supabase: ReturnType<typeof makeSupabase>['client']) {
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    getUserClient: vi.fn(async () => supabase),
    resolveCampaignId: vi.fn(async () => 'campaign-1'),
  }
}

describe('ArtifactDocumentsService document lookup UX', () => {
  it('lists campaign documents without loading every user conversation', async () => {
    const supabase = makeSupabase()
    const target = makeTarget(supabase.client)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    const result = await handlers.list_documents({ search: 'Hadassah Cyprus' }, 'session')

    expect(result).toMatchObject({
      success: true,
      campaign_id: 'campaign-1',
      campaign_documents: [
        {
          id: 'doc-1',
          document_id: 'doc-1',
          retrieve_via: {
            action: 'get_document',
            data: { document_id: 'doc-1' },
          },
        },
      ],
    })
    expect(supabase.client.from).not.toHaveBeenCalledWith('conversations')
    expect(supabase.calls).not.toContainEqual(
      expect.objectContaining({ table: 'conversation_documents', method: 'in' }),
    )
    expect(supabase.calls).toContainEqual(
      expect.objectContaining({
        table: 'conversation_documents',
        method: 'eq',
        args: ['campaign_id', 'campaign-1'],
      }),
    )
    expect(supabase.calls).toContainEqual(
      expect.objectContaining({
        table: 'conversation_documents',
        method: 'ilike',
        args: ['title', '%Hadassah Cyprus%'],
      }),
    )
  })

  it('reads a known document id through asset_id without loading every user conversation', async () => {
    const supabase = makeSupabase()
    const target = makeTarget(supabase.client)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    const result = await handlers.get_document({ asset_id: 'doc-1' }, 'session')

    expect(result).toMatchObject({
      id: 'doc-1',
      document_id: 'doc-1',
      retrieve_via: {
        action: 'get_document',
        data: { document_id: 'doc-1' },
      },
    })
    expect(supabase.client.from).not.toHaveBeenCalledWith('conversations')
    expect(supabase.calls).not.toContainEqual(
      expect.objectContaining({ table: 'conversation_documents', method: 'in' }),
    )
    expect(supabase.calls).toContainEqual(
      expect.objectContaining({
        table: 'conversation_documents',
        method: 'eq',
        args: ['id', 'doc-1'],
      }),
    )
  })

  it('pushes Space document parent filtering into the database query before limit', async () => {
    const supabase = makeSupabase()
    const target = makeTarget(supabase.client)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    await handlers.list_documents(
      { space_id: 'space-1', parent_item_id: 'folder-1', limit: 1 },
      'session',
    )

    const parentFilterIndex = supabase.calls.findIndex(
      (call) =>
        call.table === 'space_items' &&
        call.method === 'eq' &&
        call.args[0] === 'parent_item_id' &&
        call.args[1] === 'folder-1',
    )
    const limitIndex = supabase.calls.findIndex(
      (call) => call.table === 'space_items' && call.method === 'limit',
    )

    expect(parentFilterIndex).toBeGreaterThanOrEqual(0)
    expect(limitIndex).toBeGreaterThan(parentFilterIndex)
  })
})

type Row = Record<string, unknown>

function makeSyncSupabase(options: { conversationDocs: Row[]; spaceItems: Row[] }) {
  const updates: Array<{ table: string; payload: Row; filters: Record<string, unknown> }> = []

  const rowsFor = (table: string): Row[] => {
    if (table === 'conversation_documents') return options.conversationDocs
    if (table === 'space_items') return options.spaceItems
    if (table === 'spaces') {
      return [
        {
          id: 'space-1',
          schema: {
            fields: [
              { id: 'category', type: 'select', options: [{ id: 'research', label: 'Research' }] },
              { id: 'stage', type: 'select', options: [{ id: 'draft', label: 'Draft' }] },
            ],
          },
        },
      ]
    }
    return []
  }

  const rowMatches = (row: Row, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([key, value]) => {
      if (key.startsWith('custom_data->>')) {
        const jsonKey = key.slice('custom_data->>'.length)
        return ((row.custom_data as Row | null)?.[jsonKey] ?? null) === value
      }
      return row[key] === value
    })

  const client = {
    from: vi.fn((table: string) => {
      const filters: Record<string, unknown> = {}
      let pendingUpdate: Row | null = null

      const resolveOne = () => {
        const row = rowsFor(table).find((candidate) => rowMatches(candidate, filters)) ?? null
        if (pendingUpdate && row) {
          updates.push({ table, payload: { ...pendingUpdate }, filters: { ...filters } })
          Object.assign(row, pendingUpdate)
        }
        return row
      }

      const builder: Record<string, any> = {
        select: vi.fn(() => builder),
        update: vi.fn((payload: Row) => {
          pendingUpdate = payload
          return builder
        }),
        eq: vi.fn((key: string, value: unknown) => {
          filters[key] = value
          return builder
        }),
        maybeSingle: vi.fn(async () => ({ data: resolveOne(), error: null })),
        single: vi.fn(async () => {
          const row = resolveOne()
          return row
            ? { data: row, error: null }
            : { data: null, error: new Error(`No row in ${table}`) }
        }),
        then: (
          resolve?: ((value: { data: Row[]; error: null }) => unknown) | null,
          reject?: ((reason: unknown) => unknown) | null,
        ) =>
          Promise.resolve({
            data: rowsFor(table).filter((candidate) => rowMatches(candidate, filters)),
            error: null,
          }).then(resolve, reject),
      }
      return builder
    }),
  }

  return { client, updates }
}

describe('ArtifactDocumentsService update_document space sync', () => {
  const makeRows = () => ({
    conversationDocs: [
      {
        id: 'doc-1',
        conversation_id: 'conversation-1',
        campaign_id: 'campaign-1',
        title: 'Gabba x Vibey',
        content: '# Gabba',
        created_at: '2026-06-10T10:00:00.000Z',
        updated_at: '2026-06-10T10:00:00.000Z',
      },
    ],
    spaceItems: [
      {
        id: 'space-doc-1',
        space_id: 'space-1',
        title: 'Gabba x Vibey',
        parent_item_id: null,
        doc_body: '<p>Gabba</p>',
        notes: null,
        custom_data: {
          _view_type: 'doc',
          _doc_source: 'space',
          _conversation_document_id: 'doc-1',
        },
        created_at: '2026-06-10T09:00:00.000Z',
        updated_at: '2026-06-10T09:00:00.000Z',
      },
    ],
  })

  it('updates the linked space doc copy when called with the conversation document id', async () => {
    const supabase = makeSyncSupabase(makeRows())
    const target = makeTarget(supabase.client as any)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    const result = (await handlers.update_document(
      { document_id: 'doc-1', title: 'Gabber x Vibey', content: { text: '# Gabber' } },
      'session',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      document_id: 'doc-1',
      synced_space_items: [{ space_item_id: 'space-doc-1', space_id: 'space-1' }],
    })
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'conversation_documents',
        payload: expect.objectContaining({ title: 'Gabber x Vibey' }),
      }),
    )
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'space_items',
        payload: expect.objectContaining({
          title: 'Gabber x Vibey',
          // doc_body is editor HTML — markdown content must be converted on write
          doc_body: expect.stringContaining('<h1>Gabber</h1>'),
        }),
        filters: expect.objectContaining({ id: 'space-doc-1' }),
      }),
    )
  })

  it('resolves a space doc item id to its conversation document and updates both', async () => {
    const supabase = makeSyncSupabase(makeRows())
    const target = makeTarget(supabase.client as any)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    const result = (await handlers.update_document(
      { document_id: 'space-doc-1', title: 'Gabber x Vibey' },
      'session',
    )) as Record<string, unknown>

    expect(result).toMatchObject({ success: true, document_id: 'doc-1' })
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'conversation_documents',
        filters: expect.objectContaining({ id: 'doc-1' }),
        payload: expect.objectContaining({ title: 'Gabber x Vibey' }),
      }),
    )
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'space_items',
        filters: expect.objectContaining({ id: 'space-doc-1' }),
        payload: expect.objectContaining({ title: 'Gabber x Vibey' }),
      }),
    )
  })

  it('syncs newer space edits into the conversation copy when content is not replaced', async () => {
    const rows = makeRows()
    rows.spaceItems[0].doc_body = '<p>Manual edit</p>'
    rows.spaceItems[0].updated_at = '2026-06-10T12:00:00.000Z'
    const supabase = makeSyncSupabase(rows)
    const target = makeTarget(supabase.client as any)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    const result = (await handlers.update_document(
      { document_id: 'doc-1', title: 'Gabber x Vibey' },
      'session',
    )) as Record<string, unknown>

    expect(result).toMatchObject({ success: true })
    expect(result.note).toContain('space Docs copy was newer')
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'conversation_documents',
        payload: expect.objectContaining({
          title: 'Gabber x Vibey',
          content: '<p>Manual edit</p>',
        }),
      }),
    )
  })

  it('get_document returns the space copy content when it is newer than the conversation copy', async () => {
    const rows = makeRows()
    rows.spaceItems[0].doc_body = '<p>Manual edit</p>'
    rows.spaceItems[0].updated_at = '2026-06-10T12:00:00.000Z'
    const supabase = makeSyncSupabase(rows)
    const target = makeTarget(supabase.client as any)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    const result = (await handlers.get_document({ document_id: 'doc-1' }, 'session')) as Record<
      string,
      unknown
    >

    expect(result).toMatchObject({
      document_id: 'doc-1',
      space_item_id: 'space-doc-1',
      space_id: 'space-1',
      content: '<p>Manual edit</p>',
    })
    expect(String(result.note)).toContain('space Docs copy')
  })

  it('get_document falls back to a Space Doc item id without space_id', async () => {
    const supabase = makeSyncSupabase(makeRows())
    const target = makeTarget(supabase.client as any)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    const result = (await handlers.get_document(
      { document_id: 'space-doc-1' },
      'session',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      conversation_document_id: 'doc-1',
      document: expect.objectContaining({ id: 'space-doc-1', space_id: 'space-1' }),
    })
  })

  it('updates linked space doc fields without storing them on the conversation document', async () => {
    const supabase = makeSyncSupabase(makeRows())
    const target = makeTarget(supabase.client as any)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    const result = (await handlers.update_document(
      {
        document_id: 'doc-1',
        category: 'Research',
        custom_data: { stage: 'draft' },
        due_date: '2026-07-01T00:00:00.000Z',
      },
      'session',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      document_id: 'doc-1',
      synced_space_items: [{ space_item_id: 'space-doc-1', space_id: 'space-1' }],
    })
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'space_items',
        payload: expect.objectContaining({
          custom_data: expect.objectContaining({
            _conversation_document_id: 'doc-1',
            _doc_source: 'space',
            _view_type: 'doc',
            category: 'research',
            stage: 'draft',
          }),
          due_date: '2026-07-01T00:00:00.000Z',
        }),
      }),
    )
    const conversationUpdate = supabase.updates.find(
      (update) => update.table === 'conversation_documents',
    )
    expect(conversationUpdate?.payload).not.toHaveProperty('due_date')
    expect(conversationUpdate?.payload).not.toHaveProperty('custom_data')
  })

  it('rejects updates to Google Drive synced space docs', async () => {
    const rows = makeRows()
    rows.spaceItems[0].custom_data = {
      _view_type: 'doc',
      _doc_source: 'drive',
      _drive_file_id: 'drive-1',
    }
    const supabase = makeSyncSupabase(rows)
    const target = makeTarget(supabase.client as any)
    const handlers = new ArtifactDocumentsService().getHandlers(target)

    const result = (await handlers.update_document(
      { document_id: 'space-doc-1', title: 'Renamed' },
      'session',
    )) as Record<string, unknown>

    expect(result).toMatchObject({ success: false })
    expect(String(result.error)).toContain('Google Drive')
    expect(supabase.updates).toEqual([])
  })
})
