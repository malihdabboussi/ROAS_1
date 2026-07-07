import { act, renderHook, waitFor } from '@testing-library/react'
import type { RefObject } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { AtMentionItem } from './chat-input-at-mentions'
import {
  useChatInputAtMentionData,
  type UseChatInputAtMentionDataOptions,
} from './use-chat-input-at-mention-data'

function textareaRef(value: string): RefObject<HTMLTextAreaElement | null> {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setSelectionRange(value.length, value.length)
  return { current: textarea }
}

function defaultFetch(path: string): unknown {
  if (path === '/api/campaigns/campaign-1/offers') {
    return [{ id: 'offer-1', name: 'Offer One' }]
  }
  if (path === '/api/funnels?campaign_id=campaign-1') {
    return [{ id: 'funnel-1', name: null }]
  }
  if (path === '/api/campaigns/campaign-1/sequences') return []
  if (path === '/api/campaigns/campaign-1/presentations') return []
  if (path === '/api/campaigns/campaign-1/avatars') {
    return [{ id: 'avatar-1', name: null }]
  }
  if (path === '/api/media/assets?campaign_id=campaign-1&limit=50') {
    return {
      assets: [
        {
          id: 'media-1',
          name: 'Hero Image',
          mime_type: 'image/png',
          public_url: 'https://cdn.test/hero.png',
        },
      ],
    }
  }
  if (path === '/api/missions?campaign_id=campaign-1&limit=30') {
    return [{ id: 'mission-1', title: 'Launch Mission', status: 'todo' }]
  }
  if (path === '/api/campaigns') {
    return [
      { id: 'campaign-1', name: 'Current' },
      { id: 'campaign-2', name: null },
    ]
  }
  if (path === '/api/campaigns/campaign-2/offers') {
    return [{ id: 'offer-2', name: 'Remote Offer' }]
  }
  if (path === '/api/funnels?campaign_id=campaign-2') return []
  if (path === '/api/campaigns/campaign-2/sequences') return []
  if (path === '/api/media/assets?campaign_id=campaign-2&limit=30') {
    return {
      assets: [
        {
          id: 'media-2',
          name: 'Remote Video',
          mime_type: 'video/mp4',
          public_url: 'https://cdn.test/remote.mp4',
        },
      ],
    }
  }
  if (path === '/api/missions?campaign_id=campaign-2&limit=20') {
    return [{ id: 'mission-2', title: 'Remote Mission', status: 'active' }]
  }
  throw new Error(`Unexpected path ${path}`)
}

function defaultOptions(
  overrides: Partial<UseChatInputAtMentionDataOptions> = {},
): UseChatInputAtMentionDataOptions {
  return {
    campaignId: 'campaign-1',
    textareaRef: textareaRef('@off'),
    spaceTaskMentions: [],
    fetchJson: vi.fn(async (path: string) => defaultFetch(path)),
    ...overrides,
  }
}

describe('useChatInputAtMentionData', () => {
  it('loads campaign mention data, maps rows, loads other campaigns, and re-syncs the active query', async () => {
    const fetchJson = vi.fn(async (path: string) => defaultFetch(path))
    const spaceTask: AtMentionItem = {
      id: 'task-1',
      label: 'Offer Followup',
      section: 'space-task',
      type: 'todo',
    }
    const options = defaultOptions({ fetchJson, spaceTaskMentions: [spaceTask] })

    const { result } = renderHook(() => useChatInputAtMentionData(options))

    act(() => result.current.syncAtMenuFromComposer('@off', '@off'.length))

    await waitFor(() => {
      expect(result.current.atItems.map((item) => item.id)).toEqual(['offer-1', 'task-1'])
    })
    expect(result.current.atDataLoading).toBe(false)
    expect(result.current.atQuery).toBe('off')
    expect(result.current.otherCampaigns).toEqual([{ id: 'campaign-2', name: 'Untitled' }])
    expect(fetchJson).toHaveBeenCalledWith('/api/campaigns/campaign-1/offers')
    expect(fetchJson).toHaveBeenCalledWith('/api/media/assets?campaign_id=campaign-1&limit=50')
    expect(fetchJson).toHaveBeenCalledWith('/api/campaigns')
  })

  it('loads cross-campaign artifacts, media, and missions into the active menu items', async () => {
    const fetchJson = vi.fn(async (path: string) => defaultFetch(path))
    const options = defaultOptions({ fetchJson, textareaRef: textareaRef('@remote') })
    const { result } = renderHook(() => useChatInputAtMentionData(options))

    act(() => result.current.setCrossCampaignId('campaign-2'))

    await waitFor(() => {
      expect(result.current.crossCampaignLoading).toBe(false)
      expect(result.current.crossCampaignItems.map((item) => item.id)).toEqual([
        'offer-2',
        'media-2',
        'mission-2',
      ])
    })
    expect(result.current.atItems).toEqual(result.current.crossCampaignItems)
    expect(result.current.crossCampaignItems[1]).toMatchObject({
      section: 'media',
      label: 'Remote Video',
      thumbnailUrl: 'https://cdn.test/remote.mp4',
    })
    expect(fetchJson).toHaveBeenCalledWith('/api/campaigns/campaign-2/offers')
    expect(fetchJson).toHaveBeenCalledWith('/api/media/assets?campaign_id=campaign-2&limit=30')
  })

  it('closes the menu and exits cross-campaign mode when the caret leaves an @ token', () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useChatInputAtMentionData(options))

    act(() => result.current.syncAtMenuFromComposer('@offer', '@offer'.length))
    act(() => {
      result.current.setCrossCampaignMode(true)
      result.current.setCrossCampaignId('campaign-2')
      result.current.syncAtMenuFromComposer('plain text', 'plain text'.length)
    })

    expect(result.current.atMenuOpen).toBe(false)
    expect(result.current.atQuery).toBe('')
    expect(result.current.crossCampaignMode).toBe(false)
    expect(result.current.crossCampaignId).toBeNull()
  })

  it('notifies the shell to reset active row highlight when an @ token is synced', () => {
    const onActiveTokenSync = vi.fn()
    const options = defaultOptions({ onActiveTokenSync })
    const { result } = renderHook(() => useChatInputAtMentionData(options))

    act(() => result.current.syncAtMenuFromComposer('@offer', '@offer'.length))

    expect(onActiveTokenSync).toHaveBeenCalled()
  })

  it('keeps the active item list reference stable when the same token is synced twice', () => {
    const spaceTask: AtMentionItem = {
      id: 'task-1',
      label: 'Offer Followup',
      section: 'space-task',
      type: 'todo',
    }
    const options = defaultOptions({ spaceTaskMentions: [spaceTask] })
    const { result } = renderHook(() => useChatInputAtMentionData(options))

    act(() => result.current.syncAtMenuFromComposer('@off', '@off'.length))
    const firstItems = result.current.atItems
    act(() => result.current.syncAtMenuFromComposer('@off', '@off'.length))

    expect(result.current.atItems).toBe(firstItems)
  })
})
