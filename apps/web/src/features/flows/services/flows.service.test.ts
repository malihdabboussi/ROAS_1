import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  createFlowBuildSession,
  fetchFlowBuildSessionLinks,
  fetchFlows,
  fetchLatestFlowBuildSession,
  publishFlow,
  updateFlowDraft,
} from './flows.service'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  invalidateCachedFetch: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)
const cachedFetchMock = vi.mocked(cachedFetch)
const invalidateCachedFetchMock = vi.mocked(invalidateCachedFetch)

describe('flows service cache behavior', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    cachedFetchMock.mockImplementation((_key: string, fetcher: () => Promise<unknown>) => fetcher())
  })

  it('dedupes scoped flow list reads through the shared fetch cache', async () => {
    backendGetMock.mockResolvedValue([])

    await fetchFlows('space-1')

    expect(cachedFetchMock).toHaveBeenCalledWith('flows:space:space-1', expect.any(Function))
    expect(backendGetMock).toHaveBeenCalledWith('/api/spaces/space-1/automations/flows')
  })

  it('dedupes build session reads by space and conversation', async () => {
    backendGetMock.mockResolvedValueOnce(null).mockResolvedValueOnce([])

    await fetchLatestFlowBuildSession('space-1', { conversationId: 'conversation-1' })
    await fetchFlowBuildSessionLinks('space-1')

    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      1,
      'flow-build-sessions:latest:space-1:conversation-1',
      expect.any(Function),
    )
    expect(cachedFetchMock).toHaveBeenNthCalledWith(
      2,
      'flow-build-sessions:links:space-1',
      expect.any(Function),
    )
  })

  it('clears flow and build-session caches after flow mutations', async () => {
    backendPatchMock.mockResolvedValue({ id: 'flow-1' })
    backendPostMock.mockResolvedValue({
      flow: { id: 'flow-1' },
      validation: { valid: true, errors: [] },
    })

    await updateFlowDraft('space-1', 'flow-1', { name: 'Updated flow' })
    await publishFlow('space-1', 'flow-1')

    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('flows:')
    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('flow-build-sessions:')
    expect(invalidateCachedFetchMock).toHaveBeenCalledTimes(4)
  })

  it('clears flow and build-session caches after build-session mutations', async () => {
    backendPostMock.mockResolvedValue({ session: { id: 'session-1' }, plan: null })

    await createFlowBuildSession('space-1', { intent: 'New flow build' })

    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('flows:')
    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('flow-build-sessions:')
  })
})
