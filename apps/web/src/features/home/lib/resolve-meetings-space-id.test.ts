import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSpaces } from '@/lib/spaces/spaces-api'
import {
  invalidatePersonalMeetingsSpaceCache,
  resolveMeetingsSpaceId,
} from './resolve-meetings-space-id'

vi.mock('@/lib/spaces/spaces-api', () => ({
  fetchSpaces: vi.fn(),
}))

const fetchSpacesMock = vi.mocked(fetchSpaces)

describe('resolveMeetingsSpaceId', () => {
  beforeEach(() => {
    invalidatePersonalMeetingsSpaceCache()
    fetchSpacesMock.mockReset()
  })

  it('loads personal-account spaces with orgId null', async () => {
    fetchSpacesMock.mockResolvedValue([
      {
        id: 'meetings-1',
        title: 'Meetings',
        campaign_id: 'personal-campaign',
        schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
      } as never,
    ])

    await expect(resolveMeetingsSpaceId()).resolves.toBe('meetings-1')
    expect(fetchSpacesMock).toHaveBeenCalledWith({ limit: 100 }, { orgId: null })
  })

  it('prefers personal dashboard with entry_type over unrelated spaces', async () => {
    fetchSpacesMock.mockResolvedValue([
      {
        id: 'other',
        title: 'Ops',
        schema: { fields: [{ id: 'status' }] },
      },
      {
        id: 'dash-1',
        title: 'Personal Dashboard',
        space_kind: 'personal_dashboard',
        schema: { personal_dashboard: true, fields: [{ id: 'entry_type' }] },
      },
    ] as never)

    await expect(resolveMeetingsSpaceId()).resolves.toBe('dash-1')
  })

  it('caches the resolved id within the TTL', async () => {
    fetchSpacesMock.mockResolvedValue([
      {
        id: 'meetings-1',
        title: 'Meetings',
        schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
      } as never,
    ])

    await resolveMeetingsSpaceId()
    await resolveMeetingsSpaceId()
    expect(fetchSpacesMock).toHaveBeenCalledTimes(1)
  })
})
