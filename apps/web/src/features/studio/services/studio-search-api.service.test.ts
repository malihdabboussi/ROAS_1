import { describe, expect, it, vi } from 'vitest'
import {
  fetchStudioSearchIdle,
  STUDIO_SEARCH_IDLE_PRESETS,
} from './studio-search-api.service'

const backendGet = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api/backend-client', () => ({
  backendGet,
}))

describe('fetchStudioSearchIdle', () => {
  it('loads empty-query recents and returns Meetings presets', async () => {
    backendGet.mockResolvedValue({
      results: [
        {
          kind: 'conversation',
          id: 'c1',
          label: 'Recent chat',
          subtitle: 'Vibey',
          url: null,
        },
        {
          kind: 'campaign',
          id: 'camp-1',
          label: 'Campaign',
          subtitle: 'Campaign',
          url: null,
        },
        {
          kind: 'mission',
          id: 'm1',
          label: 'Mission',
          subtitle: 'active',
          url: '/missions/m1',
        },
      ],
    })

    const payload = await fetchStudioSearchIdle()

    expect(backendGet).toHaveBeenCalledWith(
      expect.stringContaining('/api/entity-search?'),
      expect.anything(),
    )
    const calledPath = String(backendGet.mock.calls[0]?.[0] ?? '')
    expect(calledPath).toContain('types=conversation%2Ccampaign%2Cmission')
    expect(calledPath).toContain('q=')
    expect(payload.recents).toHaveLength(3)
    expect(payload.presets).toEqual(STUDIO_SEARCH_IDLE_PRESETS)
    expect(payload.presets.some((preset) => preset.label === 'Meetings')).toBe(true)
  })
})
