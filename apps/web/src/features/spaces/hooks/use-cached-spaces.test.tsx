import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type RealtimeHandler = () => void

type ChannelMock = {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted(() => ({
  activeOrgId: 'org-1',
  channel: vi.fn(),
  fetchSharedWithMe: vi.fn(),
  fetchSpaces: vi.fn(),
  fetchSpacesPage: vi.fn(),
  handlers: new Map<string, RealtimeHandler>(),
  isOrgContext: true,
  lastChannel: null as ChannelMock | null,
  removeChannel: vi.fn(),
}))

vi.mock('@/lib/org/org-context-store', () => {
  const useOrgStore = Object.assign(
    (selector: (state: { activeOrgId: string | null; isOrgContext: () => boolean }) => unknown) =>
      selector({
        activeOrgId: mocks.activeOrgId,
        isOrgContext: () => mocks.isOrgContext,
      }),
    {
      getState: () => ({
        activeOrgId: mocks.activeOrgId,
        isOrgContext: () => mocks.isOrgContext,
      }),
    },
  )
  return { useOrgStore }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

vi.mock('../services/spaces.service', () => ({
  fetchSharedWithMe: mocks.fetchSharedWithMe,
  fetchSpaces: mocks.fetchSpaces,
  fetchSpacesPage: mocks.fetchSpacesPage,
}))

import { cachedSpaces, useCachedSpaces } from './use-cached-spaces'

function createChannelMock(): ChannelMock {
  const channel: ChannelMock = {
    on: vi.fn((_event, config: { table?: string }, handler: RealtimeHandler) => {
      if (config.table) mocks.handlers.set(config.table, handler)
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }
  return channel
}

describe('useCachedSpaces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    mocks.lastChannel = null
    mocks.fetchSharedWithMe.mockResolvedValue([])
    mocks.fetchSpaces.mockResolvedValue([])
    mocks.fetchSpacesPage.mockResolvedValue({
      items: [],
      nextCursor: null,
    })
    mocks.channel.mockImplementation(() => {
      mocks.lastChannel = createChannelMock()
      return mocks.lastChannel
    })
    cachedSpaces.invalidate()
  })

  afterEach(() => {
    cleanup()
  })

  it('reloads the shared spaces cache when space or share rows change', async () => {
    const { unmount } = renderHook(() => useCachedSpaces(true))

    await waitFor(() => expect(mocks.fetchSpacesPage).toHaveBeenCalledTimes(1))
    expect(mocks.handlers.has('spaces')).toBe(true)
    expect(mocks.handlers.has('space_shares')).toBe(true)
    expect(mocks.handlers.has('space_view_shares')).toBe(true)

    await act(async () => {
      mocks.handlers.get('spaces')?.()
      await new Promise((resolve) => setTimeout(resolve, 800))
    })

    await waitFor(() => expect(mocks.fetchSpacesPage).toHaveBeenCalledTimes(2))

    await act(async () => {
      mocks.handlers.get('space_shares')?.()
      await new Promise((resolve) => setTimeout(resolve, 800))
    })

    await waitFor(() => expect(mocks.fetchSpacesPage).toHaveBeenCalledTimes(3))

    unmount()
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.lastChannel)
  })
})
