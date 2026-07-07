import { describe, expect, it, vi } from 'vitest'
import { FunnelHistoryController } from '../funnel-history.controller'

describe('FunnelHistoryController', () => {
  it('passes state route scope to the history service', async () => {
    const service = {
      getState: vi.fn(async () => ({ can_undo: true, can_redo: false })),
    }
    const controller = new FunnelHistoryController(service as never)

    await controller.getState({} as never, { orgId: 'org-1' } as never, 'funnel-1', 'page-1')

    expect(service.getState).toHaveBeenCalledWith({} as never, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
      orgId: 'org-1',
    })
  })

  it('passes undo and redo body scope to the history service', async () => {
    const service = {
      undo: vi.fn(async () => ({ success: true, changed: true })),
      redo: vi.fn(async () => ({ success: true, changed: true })),
    }
    const controller = new FunnelHistoryController(service as never)

    await controller.undo({} as never, 'funnel-1', { funnel_page_id: 'page-1' })
    await controller.redo({} as never, 'funnel-1', { funnel_page_id: 'page-1' })

    expect(service.undo).toHaveBeenCalledWith({} as never, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
    })
    expect(service.redo).toHaveBeenCalledWith({} as never, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
    })
  })
})
