import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSpacesPage } from '@/features/spaces/services/spaces.service'
import type { Space } from '@/features/spaces/types'
import { fetchAllCampaignSpaces } from './fetch-all-campaign-spaces'

vi.mock('@/features/spaces/services/spaces.service', () => ({
  fetchSpacesPage: vi.fn(),
}))

const fetchSpacesPageMock = vi.mocked(fetchSpacesPage)

function space(id: string, title: string): Space {
  return {
    id,
    org_id: 'org-1',
    user_id: 'user-1',
    title,
    description: null,
    campaign_id: 'campaign-1',
    is_template: false,
    visibility: 'team',
    schema: { version: 1, fields: [], views: [] },
    created_at: '2026-07-20T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z',
  }
}

describe('fetchAllCampaignSpaces', () => {
  beforeEach(() => {
    fetchSpacesPageMock.mockReset()
  })

  it('loads every cursor page before building the campaign workspace list', async () => {
    fetchSpacesPageMock
      .mockResolvedValueOnce({
        items: [space('space-1', 'First page')],
        nextCursor: 'cursor-2',
      })
      .mockResolvedValueOnce({
        items: [space('sakha-general', 'General')],
        nextCursor: null,
      })

    await expect(fetchAllCampaignSpaces()).resolves.toEqual([
      space('space-1', 'First page'),
      space('sakha-general', 'General'),
    ])
    expect(fetchSpacesPageMock).toHaveBeenNthCalledWith(1, { limit: 100, cursor: null })
    expect(fetchSpacesPageMock).toHaveBeenNthCalledWith(2, {
      limit: 100,
      cursor: 'cursor-2',
    })
  })
})
