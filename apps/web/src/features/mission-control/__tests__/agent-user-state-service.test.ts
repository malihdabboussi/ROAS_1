import { beforeEach, describe, expect, it, vi } from 'vitest'

const backendMocks = vi.hoisted(() => ({
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => backendMocks)

describe('agent user-state service routes', () => {
  beforeEach(() => {
    backendMocks.backendGet.mockReset()
    backendMocks.backendPatch.mockReset()
  })

  it('loads agent user-state from the /api/agents surface', async () => {
    backendMocks.backendGet.mockResolvedValue([])
    const { fetchAgentUserState } = await import('../services/missions.service')

    await expect(fetchAgentUserState()).resolves.toEqual([])
    expect(backendMocks.backendGet).toHaveBeenCalledWith('/api/agents/user-state')
  })

  it('updates agent user-state through the /api/agents surface', async () => {
    backendMocks.backendPatch.mockResolvedValue({
      agent_id: 'agent-1',
      is_favorite: true,
      updated_at: '2026-05-21T00:00:00Z',
    })
    const { updateAgentUserState } = await import('../services/missions.service')

    await expect(updateAgentUserState('copywriter', { is_favorite: true })).resolves.toEqual({
      agent_id: 'agent-1',
      is_favorite: true,
      updated_at: '2026-05-21T00:00:00Z',
    })
    expect(backendMocks.backendPatch).toHaveBeenCalledWith('/api/agents/copywriter/user-state', {
      is_favorite: true,
    })
  })
})
