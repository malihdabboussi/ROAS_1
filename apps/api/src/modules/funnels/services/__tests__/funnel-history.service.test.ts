import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FunnelHistoryService } from '../funnel-history.service'

const supabase = {} as never

function fileSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file-1',
    funnel_id: 'funnel-1',
    funnel_page_id: 'page-1',
    user_id: 'user-1',
    org_id: null,
    path: 'index.html',
    content: '<!doctype html><html><body>Before</body></html>',
    role: 'entry',
    mime_type: 'text/html',
    size_bytes: 47,
    ...overrides,
  }
}

function createRepo() {
  return {
    createChangeSet: vi.fn(async () => ({ id: 'change-1' })),
    findLatestApplied: vi.fn(),
    findLatestUndone: vi.fn(),
    listChangeItems: vi.fn(),
    markChangeSetStatus: vi.fn(async () => undefined),
    restoreFileSnapshot: vi.fn(async () => undefined),
    supersedeRedo: vi.fn(async () => undefined),
    touchPages: vi.fn(async () => undefined),
  }
}

describe('FunnelHistoryService', () => {
  let repo: ReturnType<typeof createRepo>
  let service: FunnelHistoryService

  beforeEach(() => {
    repo = createRepo()
    service = new FunnelHistoryService(repo as never)
  })

  it('records meaningful before/after file snapshots', async () => {
    await service.recordFileChange(supabase, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
      userId: 'user-1',
      orgId: null,
      source: 'studio',
      action: 'write_funnel_file',
      beforeSnapshot: fileSnapshot(),
      afterSnapshot: fileSnapshot({ content: '<!doctype html><html><body>After</body></html>' }),
    })

    expect(repo.supersedeRedo).toHaveBeenCalledWith(supabase, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
    })
    expect(repo.createChangeSet).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        action: 'write_funnel_file',
        source: 'studio',
        items: [
          expect.objectContaining({
            operation: 'update',
            before_snapshot: expect.objectContaining({ content: expect.stringContaining('Before') }),
            after_snapshot: expect.objectContaining({ content: expect.stringContaining('After') }),
          }),
        ],
      }),
    )
  })

  it('does not create history for no-op file saves', async () => {
    await service.recordFileChange(supabase, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
      userId: 'user-1',
      orgId: null,
      source: 'studio',
      action: 'write_funnel_file',
      beforeSnapshot: fileSnapshot(),
      afterSnapshot: fileSnapshot(),
    })

    expect(repo.supersedeRedo).not.toHaveBeenCalled()
    expect(repo.createChangeSet).not.toHaveBeenCalled()
  })

  it('undo restores before snapshots and exposes redo state', async () => {
    repo.findLatestApplied
      .mockResolvedValueOnce({ id: 'change-1', funnel_id: 'funnel-1', funnel_page_id: 'page-1' })
      .mockResolvedValueOnce(null)
    repo.findLatestUndone.mockResolvedValueOnce({ id: 'change-1' })
    repo.listChangeItems.mockResolvedValueOnce([
      {
        entity_type: 'funnel_file',
        entity_id: 'file-1',
        path: 'index.html',
        before_snapshot: fileSnapshot(),
        after_snapshot: fileSnapshot({ content: 'after' }),
      },
    ])

    const result = await service.undo(supabase, { funnelId: 'funnel-1', funnelPageId: 'page-1' })

    expect(repo.restoreFileSnapshot).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        snapshot: expect.objectContaining({ content: expect.stringContaining('Before') }),
      }),
    )
    expect(repo.markChangeSetStatus).toHaveBeenCalledWith(supabase, 'change-1', 'undone')
    expect(result).toMatchObject({ success: true, changed: true, can_undo: false, can_redo: true })
  })

  it('redo restores after snapshots and returns undo state', async () => {
    repo.findLatestUndone
      .mockResolvedValueOnce({ id: 'change-1', funnel_id: 'funnel-1', funnel_page_id: 'page-1' })
      .mockResolvedValueOnce(null)
    repo.findLatestApplied.mockResolvedValueOnce({ id: 'change-1' })
    repo.listChangeItems.mockResolvedValueOnce([
      {
        entity_type: 'funnel_file',
        entity_id: 'file-1',
        path: 'index.html',
        before_snapshot: fileSnapshot(),
        after_snapshot: fileSnapshot({ content: 'after' }),
      },
    ])

    const result = await service.redo(supabase, { funnelId: 'funnel-1', funnelPageId: 'page-1' })

    expect(repo.restoreFileSnapshot).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ snapshot: expect.objectContaining({ content: 'after' }) }),
    )
    expect(repo.markChangeSetStatus).toHaveBeenCalledWith(supabase, 'change-1', 'applied')
    expect(result).toMatchObject({ success: true, changed: true, can_undo: true, can_redo: false })
  })
})
