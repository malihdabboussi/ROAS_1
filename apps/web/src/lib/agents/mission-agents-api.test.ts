import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  fetchAgentSkillDenies,
  fetchAgentSkillsForAgents,
  fetchMissionAgents,
  fetchMissionAgentsSlim,
  fetchAgentUserState,
  fireEmployee,
  setAgentSkillOverride,
  updateAgentImage,
  updateAgentUserState,
} from './mission-agents-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn(),
  invalidateCachedFetch: vi.fn(),
}))

const backendDeleteMock = vi.mocked(backendDelete)
const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)
const cachedFetchMock = vi.mocked(cachedFetch)
const invalidateCachedFetchMock = vi.mocked(invalidateCachedFetch)

describe('mission agents api', () => {
  beforeEach(() => {
    backendDeleteMock.mockReset()
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
    backendPostMock.mockReset()
    cachedFetchMock.mockReset()
    invalidateCachedFetchMock.mockReset()
    cachedFetchMock.mockImplementation((_key, fetcher) => fetcher())
  })

  it('fetches the full agent roster through the shared cached key', async () => {
    backendGetMock.mockResolvedValue([{ id: 'agent-1', agent_key: 'loop' }])

    await expect(fetchMissionAgents()).resolves.toEqual([{ id: 'agent-1', agent_key: 'loop' }])

    expect(cachedFetchMock).toHaveBeenCalledWith('agents:list', expect.any(Function), {
      ttlMs: 60_000,
    })
    expect(backendGetMock).toHaveBeenCalledWith('/api/agents')
  })

  it('invalidates the roster cache before forced reloads', async () => {
    backendGetMock.mockResolvedValue([])

    await fetchMissionAgents({ force: true })

    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('agents:list')
    expect(backendGetMock).toHaveBeenCalledWith('/api/agents')
  })

  it('fetches the slim roster from the existing endpoint', async () => {
    backendGetMock.mockResolvedValue([{ id: 'agent-1', agent_key: 'loop' }])

    await expect(fetchMissionAgentsSlim()).resolves.toEqual([{ id: 'agent-1', agent_key: 'loop' }])

    expect(backendGetMock).toHaveBeenCalledWith('/api/agents/slim')
  })

  it('fetches batched agent skills through the shared cached endpoint', async () => {
    backendGetMock.mockResolvedValue([{ skill_key: 'research' }])

    await expect(fetchAgentSkillsForAgents(['atlas', 'maya'], { summary: true })).resolves.toEqual([
      { skill_key: 'research' },
    ])

    expect(cachedFetchMock).toHaveBeenCalledWith(
      'agent-skills-batch:summary:atlas,maya',
      expect.any(Function),
      { ttlMs: 300_000 },
    )
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/agents/skills?agent_keys=atlas%2Cmaya&fields=summary',
    )
  })

  it('updates an agent image and invalidates the roster cache', async () => {
    backendPatchMock.mockResolvedValue({
      agent_key: 'copywriter',
      image_url: 'https://example.com/a.png',
    })

    await expect(updateAgentImage('copywriter', 'https://example.com/a.png')).resolves.toEqual({
      agent_key: 'copywriter',
      image_url: 'https://example.com/a.png',
    })
    expect(backendPatchMock).toHaveBeenCalledWith('/api/agents/copywriter/image', {
      image_url: 'https://example.com/a.png',
    })
    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('agents:list')
  })

  it('fires an employee through the agent endpoint with optional handoff data', async () => {
    backendDeleteMock.mockResolvedValue({ deleted: true })

    await expect(fireEmployee('agent key', { scope: 'default' })).resolves.toEqual({
      deleted: true,
    })

    expect(backendDeleteMock).toHaveBeenCalledWith('/api/agents/agent%20key', {
      handoff: { scope: 'default' },
    })
    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('agents:list')
  })

  it('loads and updates agent user-state through the agent endpoints', async () => {
    backendGetMock.mockResolvedValueOnce([])
    backendPatchMock.mockResolvedValueOnce({
      agent_id: 'agent-1',
      is_favorite: true,
      updated_at: '2026-06-24T00:00:00Z',
    })

    await expect(fetchAgentUserState()).resolves.toEqual([])
    await expect(updateAgentUserState('agent key', { is_favorite: true })).resolves.toEqual({
      agent_id: 'agent-1',
      is_favorite: true,
      updated_at: '2026-06-24T00:00:00Z',
    })

    expect(backendGetMock).toHaveBeenCalledWith('/api/agents/user-state')
    expect(backendPatchMock).toHaveBeenCalledWith('/api/agents/agent%20key/user-state', {
      is_favorite: true,
    })
  })

  it('writes skill overrides through the agent teams endpoint', async () => {
    backendPostMock.mockResolvedValue({
      agent_key: 'agent key',
      skill_key: 'customer research',
      enabled: false,
    })

    await expect(setAgentSkillOverride('agent key', 'customer research', false)).resolves.toEqual({
      agent_key: 'agent key',
      skill_key: 'customer research',
      enabled: false,
    })

    expect(backendPostMock).toHaveBeenCalledWith(
      '/api/agent-teams/agents/agent key/skill-overrides/customer%20research',
      { enabled: false },
    )
  })

  it('maps denied skill overrides to skill keys', async () => {
    backendGetMock.mockResolvedValue([
      { capability_kind: 'skill', capability_id: 'customer_research', mode: 'deny' },
      { capability_kind: 'workflow', capability_id: 'launch', mode: 'deny' },
      { capability_kind: 'skill', capability_id: 'system_briefing', mode: 'allow' },
    ])

    await expect(fetchAgentSkillDenies('atlas')).resolves.toEqual(['customer_research'])

    expect(backendGetMock).toHaveBeenCalledWith('/api/agent-teams/agents/atlas/overrides')
  })
})
