import { beforeEach, describe, expect, it, vi } from 'vitest'

const backendMocks = vi.hoisted(() => ({
  backendPatch: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => backendMocks)

describe('agent profile service routes', () => {
  beforeEach(() => {
    backendMocks.backendPatch.mockReset()
  })

  it('renames agents through /api/agents', async () => {
    backendMocks.backendPatch.mockResolvedValue({ agent_key: 'copywriter', name: 'New Name' })
    const { renameAgent } = await import('../services/missions.service')

    await expect(renameAgent('copywriter', 'New Name')).resolves.toEqual({
      agent_key: 'copywriter',
      name: 'New Name',
    })
    expect(backendMocks.backendPatch).toHaveBeenCalledWith('/api/agents/copywriter/name', {
      name: 'New Name',
    })
  })

  it('updates active state through /api/agents', async () => {
    backendMocks.backendPatch.mockResolvedValue({ agent_key: 'copywriter', is_active: false })
    const { updateAgentActive } = await import('../services/missions.service')

    await expect(updateAgentActive('copywriter', false)).resolves.toEqual({
      agent_key: 'copywriter',
      is_active: false,
    })
    expect(backendMocks.backendPatch).toHaveBeenCalledWith('/api/agents/copywriter/active', {
      active: false,
    })
  })

  it('updates communication through /api/agents', async () => {
    backendMocks.backendPatch.mockResolvedValue({ agent_key: 'copywriter' })
    const { updateAgentCommunication } = await import('../services/missions.service')

    await expect(updateAgentCommunication('copywriter', { model_id: 'auto' })).resolves.toEqual({
      agent_key: 'copywriter',
    })
    expect(backendMocks.backendPatch).toHaveBeenCalledWith('/api/agents/copywriter/communication', {
      model_id: 'auto',
    })
  })

  it('updates image through /api/agents', async () => {
    backendMocks.backendPatch.mockResolvedValue({
      agent_key: 'copywriter',
      image_url: 'https://example.com/a.png',
    })
    const { updateAgentImage } = await import('../services/missions.service')

    await expect(updateAgentImage('copywriter', 'https://example.com/a.png')).resolves.toEqual({
      agent_key: 'copywriter',
      image_url: 'https://example.com/a.png',
    })
    expect(backendMocks.backendPatch).toHaveBeenCalledWith('/api/agents/copywriter/image', {
      image_url: 'https://example.com/a.png',
    })
  })
})
