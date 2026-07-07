import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { fetchTeamRoster } from './team-roster-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

describe('team roster api', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
  })

  it('lists the full team roster without query params by default', async () => {
    backendGetMock.mockResolvedValue([])

    await expect(fetchTeamRoster()).resolves.toEqual([])

    expect(backendGetMock).toHaveBeenCalledWith('/api/team-roster')
  })

  it('preserves kind and ready-only roster query params', async () => {
    backendGetMock.mockResolvedValue([{ participant_id: 'agent:loop' }])

    await expect(fetchTeamRoster({ kind: 'all', readyOnly: true })).resolves.toEqual([
      { participant_id: 'agent:loop' },
    ])

    expect(backendGetMock).toHaveBeenCalledWith('/api/team-roster?kind=all&ready_only=true')
  })
})
