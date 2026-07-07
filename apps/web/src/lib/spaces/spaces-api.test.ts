import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import {
  fetchSpaceItem,
  fetchSpaceItemById,
  fetchSpacesPage,
  fetchSpaces,
  renameItemCommentAttachment,
  visualizeSpaceDoc,
} from './spaces-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)

describe('spaces api', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
    backendPostMock.mockReset()
  })

  it('preserves the existing empty query suffix for space listing', async () => {
    backendGetMock.mockResolvedValue([])

    await expect(fetchSpaces()).resolves.toEqual([])

    expect(backendGetMock).toHaveBeenCalledWith('/api/spaces?', undefined)
  })

  it('fetches spaces with existing query parameter order and backend options', async () => {
    const backendOptions = { orgId: 'org-1' }
    backendGetMock.mockResolvedValue([{ id: 'space-1', title: 'Space' }])

    await expect(
      fetchSpaces({ limit: 100, campaign_id: 'campaign-1', general: true }, backendOptions),
    ).resolves.toEqual([{ id: 'space-1', title: 'Space' }])

    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/spaces?limit=100&campaign_id=campaign-1&general=true',
      backendOptions,
    )
  })

  it('clamps legacy space listing limits to the backend maximum', async () => {
    backendGetMock.mockResolvedValue([])

    await expect(fetchSpaces({ limit: 200 })).resolves.toEqual([])

    expect(backendGetMock).toHaveBeenCalledWith('/api/spaces?limit=100', undefined)
  })

  it('fetches a cursor-paginated spaces page', async () => {
    const backendOptions = { orgId: 'org-1' }
    backendGetMock.mockResolvedValue({
      items: [{ id: 'space-1', title: 'Space' }],
      next_cursor: 'cursor-2',
    })

    await expect(
      fetchSpacesPage({ limit: 200, cursor: 'cursor-1' }, backendOptions),
    ).resolves.toEqual({
      items: [{ id: 'space-1', title: 'Space' }],
      nextCursor: 'cursor-2',
    })

    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/spaces?limit=100&paginated=true&cursor=cursor-1',
      backendOptions,
    )
  })

  it('fetches a space item by the global item route first', async () => {
    backendGetMock.mockResolvedValue({ id: 'item-1', title: 'Doc' })

    await expect(fetchSpaceItemById('item-1')).resolves.toEqual({ id: 'item-1', title: 'Doc' })

    expect(backendGetMock).toHaveBeenCalledWith('/api/spaces/items/item-1')
  })

  it('falls back to entity search and space item listing when the global route fails', async () => {
    backendGetMock
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({
        results: [
          {
            kind: 'doc',
            id: 'doc-entity-1',
            label: 'Pitch Doc',
            url: '/spaces/space-1/item-1',
          },
        ],
      })
      .mockResolvedValueOnce([
        { id: 'item-1', title: 'Pitch Doc' },
        { id: 'item-2', title: 'Other Doc' },
      ])

    await expect(fetchSpaceItemById('doc-entity-1', 'Pitch Doc')).resolves.toEqual({
      id: 'item-1',
      title: 'Pitch Doc',
    })

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/spaces/items/doc-entity-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(
      2,
      '/api/entity-search?types=doc&limit=50&q=Pitch+Doc',
    )
    expect(backendGetMock).toHaveBeenNthCalledWith(3, '/api/spaces/space-1/items')
  })

  it('falls back from scoped item route to the scoped list before global lookup', async () => {
    backendGetMock
      .mockRejectedValueOnce(new Error('scoped route unavailable'))
      .mockResolvedValueOnce([
        { id: 'item-1', title: 'Scoped Doc' },
        { id: 'item-2', title: 'Other Doc' },
      ])

    await expect(fetchSpaceItem('space-1', 'item-1')).resolves.toEqual({
      id: 'item-1',
      title: 'Scoped Doc',
    })

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/spaces/space-1/items/item-1')
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/spaces/space-1/items')
  })

  it('renames a task activity attachment with the existing patch payload', async () => {
    backendPatchMock.mockResolvedValue({
      id: 'activity-1',
      item_id: 'item-1',
      space_id: 'space-1',
      user_id: 'user-1',
      org_id: 'org-1',
      event_type: 'comment',
      payload: {},
      created_at: '2026-06-28T11:20:00.000Z',
    })

    await expect(
      renameItemCommentAttachment(
        'space-1',
        'item-1',
        'activity-1',
        'https://files.example/original.pdf',
        'Renamed.pdf',
      ),
    ).resolves.toEqual({
      id: 'activity-1',
      item_id: 'item-1',
      space_id: 'space-1',
      user_id: 'user-1',
      org_id: 'org-1',
      event_type: 'comment',
      payload: {},
      created_at: '2026-06-28T11:20:00.000Z',
    })

    expect(backendPatchMock).toHaveBeenCalledWith(
      '/api/spaces/space-1/items/item-1/activity/activity-1',
      {
        attachment_rename: {
          file_url: 'https://files.example/original.pdf',
          filename: 'Renamed.pdf',
        },
      },
    )
  })

  it('visualizes a space doc with the existing post route and payload', async () => {
    backendPostMock.mockResolvedValue({
      success: true,
      item_id: 'item-1',
      space_id: 'space-1',
      title: 'Doc title',
      html: '<main>Visual</main>',
      source_hash: 'visual-hash',
      custom_data: { _doc_visual_html: '<main>Visual</main>' },
    })

    await expect(
      visualizeSpaceDoc('space-1', 'item-1', { force: true, prompt: 'make it visual' }),
    ).resolves.toEqual({
      success: true,
      item_id: 'item-1',
      space_id: 'space-1',
      title: 'Doc title',
      html: '<main>Visual</main>',
      source_hash: 'visual-hash',
      custom_data: { _doc_visual_html: '<main>Visual</main>' },
    })

    expect(backendPostMock).toHaveBeenCalledWith(
      '/api/spaces/space-1/items/item-1/visualize-doc',
      { force: true, prompt: 'make it visual' },
    )
  })
})
