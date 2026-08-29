import { describe, expect, it, vi } from 'vitest'
import { MissionContextEnricherService } from './mission-context-enricher.service'
import { createSpaceDocItem } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

function query(result: Record<string, unknown>) {
  const chain: any = {
    eq: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    is: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
    update: vi.fn(() => chain),
    then(
      onFulfilled: (value: Record<string, unknown>) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }
  return chain
}

describe('artifact helper data access', () => {
  it('creates a space doc item with source metadata', async () => {
    let inserted: Record<string, unknown> | null = null
    const supabase = {
      from: vi.fn(() => {
        const chain = query({ data: { id: 'item-1' }, error: null })
        chain.insert = vi.fn((payload: Record<string, unknown>) => {
          inserted = payload
          return chain
        })
        return chain
      }),
    }

    const result = await createSpaceDocItem(supabase as any, {
      docBody: 'Doc body',
      documentType: 'pdf',
      fileName: 'brief.pdf',
      mimeType: 'application/pdf',
      orgId: 'org-1',
      sourceId: 'source-1',
      spaceId: 'space-1',
      title: 'Brief',
      userId: 'user-1',
    })

    expect(result).toEqual({ id: 'item-1', warnings: [] })
    expect(inserted).toMatchObject({
      custom_data: {
        _doc_file_name: 'brief.pdf',
        _doc_mime_type: 'application/pdf',
        _doc_source: 'space',
        _doc_type: 'pdf',
        _source_id: 'source-1',
        _view_type: 'doc',
      },
      doc_body: 'Doc body',
      org_id: 'org-1',
      space_id: 'space-1',
      title: 'Brief',
      user_id: 'user-1',
    })
  })

  it('creates a space doc item with task-style space fields', async () => {
    let inserted: Record<string, unknown> | null = null
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'spaces') {
          return query({
            data: {
              id: 'space-1',
              schema: {
                fields: [
                  { id: 'category', type: 'select', options: [{ id: 'client', label: 'Client' }] },
                  { id: 'stage', type: 'select', options: [{ id: 'draft', label: 'Draft' }] },
                ],
              },
            },
            error: null,
          })
        }
        const chain = query({ data: { id: 'item-1' }, error: null })
        chain.insert = vi.fn((payload: Record<string, unknown>) => {
          inserted = payload
          return chain
        })
        return chain
      }),
    }

    const result = await createSpaceDocItem(supabase as any, {
      docBody: 'Doc body',
      documentType: 'brief',
      fieldInput: {
        category: 'Client',
        custom_data: { stage: 'draft' },
        due_date: '2026-07-01T00:00:00.000Z',
        priority: 'high',
      },
      orgId: 'org-1',
      sourceId: 'source-1',
      spaceId: 'space-1',
      title: 'Brief',
      userId: 'user-1',
    })

    expect(result).toEqual({ id: 'item-1', warnings: [] })
    expect(inserted).toMatchObject({
      custom_data: {
        _doc_source: 'space',
        _doc_type: 'brief',
        _source_id: 'source-1',
        _view_type: 'doc',
        category: 'client',
        stage: 'draft',
      },
      due_date: '2026-07-01T00:00:00.000Z',
      priority: 'high',
    })
  })

  it('pins a space view through explicit and campaign fallback scopes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
    const updates: Record<string, unknown>[] = []
    let fromCall = 0
    const supabase = {
      from: vi.fn(() => {
        fromCall += 1
        const result =
          fromCall === 3
            ? { data: [{ id: 'fallback-space' }], error: null }
            : { data: { id: 'space-1', schema: { views: [] } }, error: null }
        const chain = query(result)
        chain.update = vi.fn((payload: Record<string, unknown>) => {
          updates.push(payload)
          return chain
        })
        return chain
      }),
    }

    await ensureSpaceView({
      supabase: supabase as any,
      spaceId: 'space-1',
      campaignId: null,
      viewType: 'docs',
    })
    await ensureSpaceView({
      supabase: supabase as any,
      spaceId: null,
      campaignId: 'campaign-1',
      viewType: 'ads',
    })

    expect(updates).toHaveLength(2)
    expect(updates[0].schema).toMatchObject({ views: [expect.objectContaining({ type: 'docs' })] })
    expect(updates[1].schema).toMatchObject({ views: [expect.objectContaining({ type: 'ads' })] })
  })

  it('adds MCP, integration, brain, theme, and pulse context to mission bodies', async () => {
    const projectQuery = query({ data: { id: 'project-1' }, error: null })
    const supabase = {
      from: vi.fn(() => projectQuery),
    }
    const body: Record<string, unknown> = {
      input: [{ type: 'message', role: 'user', content: 'Start' }],
      instructions: 'Base instructions',
    }
    const buildFullContext = vi.fn(async () => '<brain />')
    const enricher = new MissionContextEnricherService(
      { buildIntegrationContext: vi.fn(async () => '<integrations />') } as any,
      { buildFullContext } as any,
      { buildThemeSummary: vi.fn(async () => '<theme />') } as any,
      { buildPulse: vi.fn(async () => '<pulse />') } as any,
      { client: supabase } as any,
      {
        getEnabledServersForAgent: vi.fn(async () => [
          { name: 'drive', description: 'Google Drive tools' },
        ]),
      } as any,
    )

    await enricher.enrichMissionBody(body, 'user-1', 'agent-1', 'campaign-1', 'org-1')

    expect(buildFullContext).toHaveBeenCalledWith(
      'user-1',
      'agent-1',
      'Start',
      'org-1',
      undefined,
      undefined,
      undefined,
      'campaign-1',
    )
    expect(body.instructions).toContain('Base instructions')
    expect(body.instructions).toContain('<integrations />')
    expect(body.instructions).toContain('<available_mcp_servers>')
    expect(body.input).toEqual([
      expect.objectContaining({ role: 'user', content: expect.stringContaining('<theme />') }),
      expect.objectContaining({ role: 'assistant', content: 'Context received.' }),
      { type: 'message', role: 'user', content: 'Start' },
    ])
  })
})
