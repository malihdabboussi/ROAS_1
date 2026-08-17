import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveMissingUrlSpace } from './use-space-url-view-sync'

const mocks = vi.hoisted(() => ({
  reload: vi.fn(),
  mutate: vi.fn(),
  loadSpaces: vi.fn(),
  fetchSpaceById: vi.fn(),
  getSpaces: vi.fn(() => [] as Array<{ id: string }>),
  setState: vi.fn(),
  activeOrgId: 'org-1' as string | null,
}))

vi.mock('./use-cached-spaces', () => ({
  cachedSpaces: {
    reload: mocks.reload,
    mutate: mocks.mutate,
  },
}))

vi.mock('../services/spaces.service', () => ({
  fetchSpaceById: mocks.fetchSpaceById,
}))

vi.mock('@/lib/org/org-context-store', () => ({
  useOrgStore: {
    getState: () => ({ activeOrgId: mocks.activeOrgId }),
  },
}))

vi.mock('../store/use-spaces-store', () => ({
  useSpacesStore: Object.assign(() => ({}), {
    getState: () => ({
      spaces: mocks.getSpaces(),
      loadSpaces: mocks.loadSpaces,
      setActiveSpace: vi.fn(),
    }),
    setState: mocks.setState,
  }),
}))

describe('resolveMissingUrlSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.activeOrgId = 'org-1'
    mocks.reload.mockResolvedValue([])
    mocks.loadSpaces.mockResolvedValue(undefined)
    mocks.getSpaces.mockReturnValue([])
  })

  it('returns the space after list reload without a direct fetch', async () => {
    mocks.getSpaces.mockReturnValue([{ id: 'space-1' }])
    await expect(resolveMissingUrlSpace('space-1')).resolves.toEqual({ id: 'space-1' })
    expect(mocks.fetchSpaceById).not.toHaveBeenCalled()
  })

  it('fetches by id and merges when the space is still missing after reload', async () => {
    const space = { id: 'space-deep', title: 'Deep' }
    mocks.fetchSpaceById.mockResolvedValue(space)
    await expect(resolveMissingUrlSpace('space-deep')).resolves.toEqual(space)
    expect(mocks.fetchSpaceById).toHaveBeenCalledWith('space-deep')
    expect(mocks.mutate).toHaveBeenCalled()
    expect(mocks.setState).toHaveBeenCalled()
  })

  it('returns null when direct fetch fails so callers do not retry-storm', async () => {
    mocks.fetchSpaceById.mockRejectedValue(new Error('Space not found'))
    await expect(resolveMissingUrlSpace('missing')).resolves.toBeNull()
  })
})
