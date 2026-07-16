import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageGraderApiService } from '../page-grader-api.service'

describe('PageGraderApiService.sendWork', () => {
  const pageGrader = {
    createWork: vi.fn(),
    healthCheck: vi.fn(),
    listClients: vi.fn(),
  }
  const vault = {
    getSecret: vi.fn(),
    hasSecret: vi.fn(),
    storeSecret: vi.fn(),
    deleteSecret: vi.fn(),
  }
  const connections = {
    upsertConnection: vi.fn(),
    markPersonalDisconnected: vi.fn(),
    ensureAvailable: vi.fn(),
    getSimpleStatus: vi.fn(),
  }
  const spaces = {
    getItem: vi.fn(),
    updateItem: vi.fn(),
  }
  const svc = {
    client: {
      from: vi.fn(),
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: null } }) } },
    },
  }
  const config = { get: vi.fn().mockReturnValue('https://app.roas.io') }

  let service: PageGraderApiService

  beforeEach(() => {
    vi.clearAllMocks()
    vault.getSecret.mockImplementation(async (_u: string, _p: string, label: string) => {
      if (label === 'base_url') return 'https://example.supabase.co/functions/v1/roas-api'
      if (label === 'api_key') return 'test-key'
      return null
    })
    service = new PageGraderApiService(
      pageGrader as never,
      vault as never,
      connections as never,
      spaces as never,
      svc as never,
      config as never,
    )
  })

  it('skips items already sent to Page Grader', async () => {
    spaces.getItem.mockResolvedValue({
      id: 'item-1',
      title: 'Offer page',
      custom_data: {
        page_grader: {
          work_id: 'pg-1',
          work_url: 'https://portal.roas.io/launcher?task=pg-1',
        },
      },
      assignees: [],
    })

    const result = await service.sendWork({} as never, 'user-1', {
      client_id: '11111111-1111-1111-1111-111111111111',
      space_id: '22222222-2222-2222-2222-222222222222',
      space_item_ids: ['33333333-3333-3333-3333-333333333333'],
    })

    expect(result.results).toEqual([
      {
        space_item_id: '33333333-3333-3333-3333-333333333333',
        status: 'skipped_already_sent',
        work_id: 'pg-1',
        work_url: 'https://portal.roas.io/launcher?task=pg-1',
      },
    ])
    expect(pageGrader.createWork).not.toHaveBeenCalled()
  })

  it('creates work and writes custom_data.page_grader', async () => {
    spaces.getItem.mockResolvedValue({
      id: 'item-1',
      title: 'Draft offer page',
      notes: 'Need CTA',
      priority: 'high',
      due_date: '2026-07-20',
      tags: ['funnel'],
      assignees: [],
      custom_data: { fathom_url: 'https://fathom.video/x' },
      parent_item_id: null,
    })
    pageGrader.createWork.mockResolvedValue({
      status: 201,
      work: {
        id: 'work-9',
        kind: 'task',
        client_id: '11111111-1111-1111-1111-111111111111',
        url: 'https://portal.roas.io/launcher?task=work-9',
        assignee_resolution: [],
      },
    })
    spaces.updateItem.mockResolvedValue({})

    const result = await service.sendWork({} as never, 'user-1', {
      client_id: '11111111-1111-1111-1111-111111111111',
      note: 'Build ASAP',
      space_id: '22222222-2222-2222-2222-222222222222',
      space_item_ids: ['33333333-3333-3333-3333-333333333333'],
    })

    expect(pageGrader.createWork).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/roas-api',
      'test-key',
      expect.objectContaining({
        client_id: '11111111-1111-1111-1111-111111111111',
        work: expect.objectContaining({ title: 'Draft offer page', priority: 'high' }),
      }),
    )
    expect(spaces.updateItem).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      expect.objectContaining({
        custom_data: expect.objectContaining({
          page_grader: expect.objectContaining({
            work_id: 'work-9',
            client_id: '11111111-1111-1111-1111-111111111111',
          }),
        }),
      }),
      undefined,
      undefined,
    )
    expect(result.results[0]?.status).toBe('created')
  })
})
