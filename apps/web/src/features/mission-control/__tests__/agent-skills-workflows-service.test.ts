import { beforeEach, describe, expect, it, vi } from 'vitest'

const backendMocks = vi.hoisted(() => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
  backendPatch: vi.fn(),
  backendDelete: vi.fn(),
}))

vi.mock('@/lib/api/backend-client', () => backendMocks)

describe('agent skills and workflows service routes', () => {
  beforeEach(() => {
    backendMocks.backendGet.mockReset()
    backendMocks.backendPost.mockReset()
    backendMocks.backendPatch.mockReset()
    backendMocks.backendDelete.mockReset()
  })

  it('loads skills through /api/agents', async () => {
    backendMocks.backendGet.mockResolvedValue([])
    const { fetchAgentSkills } = await import('../services/missions.service')

    await expect(fetchAgentSkills('copywriter')).resolves.toEqual([])
    expect(backendMocks.backendGet).toHaveBeenCalledWith('/api/agents/copywriter/skills')
  })

  it('creates skills through /api/agents', async () => {
    backendMocks.backendPost.mockResolvedValue({ id: 'skill-1' })
    const { createAgentSkill } = await import('../services/missions.service')
    const payload = {
      skill_key: 'copy',
      name: 'Copy',
      description: 'Writes copy',
      markdown_content: '# Copy',
    }

    await expect(createAgentSkill('copywriter', payload)).resolves.toEqual({ id: 'skill-1' })
    expect(backendMocks.backendPost).toHaveBeenCalledWith('/api/agents/copywriter/skills', payload)
  })

  it('updates skills through /api/agents', async () => {
    backendMocks.backendPatch.mockResolvedValue({ id: 'skill-1', name: 'Copy' })
    const { updateAgentSkill } = await import('../services/missions.service')

    await expect(updateAgentSkill('copywriter', 'skill-1', { name: 'Copy' })).resolves.toEqual({
      id: 'skill-1',
      name: 'Copy',
    })
    expect(backendMocks.backendPatch).toHaveBeenCalledWith(
      '/api/agents/copywriter/skills/skill-1',
      { name: 'Copy' },
    )
  })

  it('deletes skills through /api/agents', async () => {
    backendMocks.backendDelete.mockResolvedValue(undefined)
    const { deleteAgentSkill } = await import('../services/missions.service')

    await expect(deleteAgentSkill('copywriter', 'skill-1')).resolves.toEqual({ deleted: true })
    expect(backendMocks.backendDelete).toHaveBeenCalledWith('/api/agents/copywriter/skills/skill-1')
  })

  it('loads workflows through /api/agents', async () => {
    backendMocks.backendGet.mockResolvedValue([])
    const { fetchAgentWorkflows } = await import('../services/missions.service')

    await expect(fetchAgentWorkflows('copywriter')).resolves.toEqual([])
    expect(backendMocks.backendGet).toHaveBeenCalledWith('/api/agents/copywriter/workflows')
  })

  it('creates skill resources through /api/agents', async () => {
    backendMocks.backendPost.mockResolvedValue({ id: 'resource-1' })
    const { createAgentSkillResource } = await import('../services/missions.service')
    const payload = { file_path: 'docs/example.md', content: '# Example' }

    await expect(createAgentSkillResource('copywriter', 'copy', payload)).resolves.toEqual({
      id: 'resource-1',
    })
    expect(backendMocks.backendPost).toHaveBeenCalledWith(
      '/api/agents/copywriter/skills/copy/resources',
      payload,
    )
  })
})
