import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSpaces } from '@/lib/spaces/spaces-api'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'
import {
  invalidatePersonalMeetingsSpaceCache,
  rankPersonalMeetingsSpace,
  resolveMeetingsSpaceId,
} from './resolve-meetings-space-id'

vi.mock('@/lib/spaces/spaces-api', () => ({
  fetchSpaces: vi.fn(),
}))

vi.mock('@/lib/utils/org-storage', () => ({
  getActiveOrgIdFromStorage: vi.fn(() => null),
}))

const fetchSpacesMock = vi.mocked(fetchSpaces)
const getActiveOrgIdMock = vi.mocked(getActiveOrgIdFromStorage)

describe('resolveMeetingsSpaceId', () => {
  beforeEach(() => {
    invalidatePersonalMeetingsSpaceCache()
    fetchSpacesMock.mockReset()
    getActiveOrgIdMock.mockReset()
    getActiveOrgIdMock.mockReturnValue(null)
  })

  it('loads personal-account spaces with orgId null when no active org', async () => {
    fetchSpacesMock.mockResolvedValue([
      {
        id: 'meetings-1',
        title: 'Meetings',
        campaign_id: 'personal-campaign',
        schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
      } as never,
    ])

    await expect(resolveMeetingsSpaceId()).resolves.toBe('meetings-1')
    expect(fetchSpacesMock).toHaveBeenCalledWith({ limit: 200 }, { orgId: null })
  })

  it('prefers active org Meetings over personal', async () => {
    getActiveOrgIdMock.mockReturnValue('org-1')
    fetchSpacesMock.mockImplementation(async (_opts, backend) => {
      if (backend?.orgId === 'org-1') {
        return [
          {
            id: 'org-meetings',
            title: 'Meetings',
            campaign_id: 'org-general',
            schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
          },
        ] as never
      }
      return [
        {
          id: 'personal-meetings',
          title: 'Meetings',
          campaign_id: 'personal-campaign',
          schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
        },
      ] as never
    })

    await expect(resolveMeetingsSpaceId()).resolves.toBe('org-meetings')
    expect(fetchSpacesMock).toHaveBeenCalledWith({ limit: 200 }, { orgId: 'org-1' })
  })

  it('falls back to personal when org has no Meetings surface', async () => {
    getActiveOrgIdMock.mockReturnValue('org-1')
    fetchSpacesMock.mockImplementation(async (_opts, backend) => {
      if (backend?.orgId === 'org-1') {
        return [{ id: 'other', title: 'Ops', schema: { fields: [{ id: 'status' }] } }] as never
      }
      return [
        {
          id: 'personal-meetings',
          title: 'Meetings',
          schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
        },
      ] as never
    })

    await expect(resolveMeetingsSpaceId()).resolves.toBe('personal-meetings')
  })

  it('prefers Meetings over a newer empty Personal Dashboard', async () => {
    fetchSpacesMock.mockResolvedValue([
      {
        id: 'dash-empty',
        title: 'Personal Dashboard',
        schema: { personal_dashboard: true, fields: [{ id: 'entry_type' }] },
      },
      {
        id: 'meetings-1',
        title: 'Meetings',
        campaign_id: 'personal-campaign',
        schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
      },
    ] as never)

    await expect(resolveMeetingsSpaceId()).resolves.toBe('meetings-1')
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

describe('rankPersonalMeetingsSpace', () => {
  it('scores Meetings highest', () => {
    expect(
      rankPersonalMeetingsSpace({
        id: 'm',
        title: 'Meetings',
        schema: { icon: 'video', fields: [{ id: 'entry_type' }] },
      } as never),
    ).toBeGreaterThan(
      rankPersonalMeetingsSpace({
        id: 'd',
        title: 'Personal Dashboard',
        schema: { personal_dashboard: true, fields: [{ id: 'entry_type' }] },
      } as never),
    )
  })
})
