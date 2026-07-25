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
    findNextUndone: vi.fn(),
    listRestorableChangeSets: vi.fn(),
    listChangeItems: vi.fn(),
    markChangeSetStatus: vi.fn(async () => undefined),
    restoreFileSnapshot: vi.fn(async () => undefined),
    supersedeRedo: vi.fn(async () => undefined),
    setBookmarked: vi.fn(async () => ({ id: 'change-1', is_bookmarked: true })),
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
            before_snapshot: expect.objectContaining({
              content: expect.stringContaining('Before'),
            }),
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

  it('bookmarks a saved version in the requested funnel', async () => {
    const result = await service.setBookmark(supabase, {
      funnelId: 'funnel-1',
      changeSetId: 'change-1',
      bookmarked: true,
    })

    expect(repo.setBookmarked).toHaveBeenCalledWith(supabase, {
      funnelId: 'funnel-1',
      changeSetId: 'change-1',
      bookmarked: true,
    })
    expect(result).toEqual({
      success: true,
      change_set_id: 'change-1',
      bookmarked: true,
    })
  })

  it('undo restores before snapshots and exposes redo state', async () => {
    repo.findLatestApplied
      .mockResolvedValueOnce({ id: 'change-1', funnel_id: 'funnel-1', funnel_page_id: 'page-1' })
      .mockResolvedValueOnce(null)
    repo.findNextUndone.mockResolvedValueOnce({ id: 'change-1' })
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
    repo.findNextUndone
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

  it('lists saved revisions newest first and identifies the current version', async () => {
    repo.listRestorableChangeSets.mockResolvedValueOnce([
      {
        id: 'change-2',
        label: 'Updated styles.css',
        source: 'agent',
        status: 'undone',
        created_at: '2026-06-16T12:00:00.000Z',
      },
      {
        id: 'change-1',
        label: 'Updated index.html',
        source: 'studio',
        status: 'applied',
        created_at: '2026-06-16T11:00:00.000Z',
      },
    ])

    const result = await service.listHistory(supabase, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
    })

    expect(repo.listRestorableChangeSets).toHaveBeenCalledWith(supabase, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
      ascending: false,
      limit: 50,
    })
    expect(result).toMatchObject({
      current_change_set_id: 'change-1',
      entries: [
        expect.objectContaining({ id: 'change-2', status: 'undone' }),
        expect.objectContaining({ id: 'change-1', status: 'applied' }),
      ],
    })
  })

  it('restores an older version by undoing every newer applied change in reverse order', async () => {
    repo.listRestorableChangeSets.mockResolvedValueOnce([
      { id: 'change-1', status: 'applied' },
      { id: 'change-2', status: 'applied' },
      { id: 'change-3', status: 'applied' },
    ])
    repo.listChangeItems.mockImplementation(async (_client, changeSetId: string) => [
      {
        entity_type: 'funnel_file',
        entity_id: 'file-1',
        funnel_page_id: 'page-1',
        path: 'index.html',
        before_snapshot: fileSnapshot({ content: `before-${changeSetId}` }),
        after_snapshot: fileSnapshot({ content: `after-${changeSetId}` }),
      },
    ])
    repo.findLatestApplied.mockResolvedValue({ id: 'change-1' })
    repo.findNextUndone.mockResolvedValue({ id: 'change-2' })

    const result = await service.restore(supabase, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
      changeSetId: 'change-1',
    })

    expect(repo.listChangeItems.mock.calls.map((call) => call[1])).toEqual(['change-3', 'change-2'])
    expect(repo.markChangeSetStatus.mock.calls).toEqual([
      [supabase, 'change-3', 'undone'],
      [supabase, 'change-2', 'undone'],
    ])
    expect(result).toMatchObject({
      success: true,
      changed: true,
      restored_change_set_id: 'change-1',
    })
  })

  it('restores a newer undone version by replaying changes oldest first', async () => {
    repo.listRestorableChangeSets.mockResolvedValueOnce([
      { id: 'change-1', status: 'applied' },
      { id: 'change-2', status: 'undone' },
      { id: 'change-3', status: 'undone' },
    ])
    repo.listChangeItems.mockImplementation(async (_client, changeSetId: string) => [
      {
        entity_type: 'funnel_file',
        entity_id: 'file-1',
        funnel_page_id: 'page-1',
        path: 'index.html',
        before_snapshot: fileSnapshot({ content: `before-${changeSetId}` }),
        after_snapshot: fileSnapshot({ content: `after-${changeSetId}` }),
      },
    ])
    repo.findLatestApplied.mockResolvedValue({ id: 'change-3' })
    repo.findNextUndone.mockResolvedValue(null)

    await service.restore(supabase, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
      changeSetId: 'change-3',
    })

    expect(repo.listChangeItems.mock.calls.map((call) => call[1])).toEqual(['change-2', 'change-3'])
    expect(repo.markChangeSetStatus.mock.calls).toEqual([
      [supabase, 'change-2', 'applied'],
      [supabase, 'change-3', 'applied'],
    ])
  })
})
