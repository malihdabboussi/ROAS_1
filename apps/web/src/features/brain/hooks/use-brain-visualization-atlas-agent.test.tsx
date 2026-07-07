import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  backfillBrainScholar,
  fetchMissionAgents,
  type MissionAgent,
} from '@/lib/agents'
import { useBrainVisualizationAtlasAgent } from './use-brain-visualization-atlas-agent'

vi.mock('@/lib/agents', () => ({
  backfillBrainScholar: vi.fn(),
  fetchMissionAgents: vi.fn(),
}))

const backfillBrainScholarMock = vi.mocked(backfillBrainScholar)
const fetchMissionAgentsMock = vi.mocked(fetchMissionAgents)

function missionAgent(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'agent-atlas',
    user_id: 'user-1',
    agent_key: 'atlas',
    name: 'Atlas',
    role: 'Brain Scholar',
    status: 'online',
    skills: [],
    image_url: null,
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

describe('useBrainVisualizationAtlasAgent', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns an existing Atlas agent without backfilling', async () => {
    fetchMissionAgentsMock.mockResolvedValue([
      missionAgent({ id: 'agent-loop', agent_key: 'loop', name: 'Loop' }),
      missionAgent(),
    ])
    const reloadScopeNav = vi.fn()

    const { result } = renderHook(() => useBrainVisualizationAtlasAgent(reloadScopeNav))

    expect(result.current.atlasLoading).toBe(true)
    await waitFor(() => {
      expect(result.current.atlasAgent?.agent_key).toBe('atlas')
      expect(result.current.atlasLoading).toBe(false)
    })
    expect(backfillBrainScholarMock).not.toHaveBeenCalled()
    expect(reloadScopeNav).not.toHaveBeenCalled()
  })

  it('backfills Atlas when it is missing and reloads scope navigation only after creation', async () => {
    const backfill = deferred<{ ok: boolean; created: boolean }>()
    fetchMissionAgentsMock.mockResolvedValue([])
    backfillBrainScholarMock.mockReturnValue(backfill.promise)
    const reloadScopeNav = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() => useBrainVisualizationAtlasAgent(reloadScopeNav))

    await waitFor(() => {
      expect(backfillBrainScholarMock).toHaveBeenCalledTimes(1)
      expect(result.current.atlasAgent).toBeNull()
      expect(result.current.atlasLoading).toBe(false)
    })
    expect(reloadScopeNav).not.toHaveBeenCalled()

    await act(async () => {
      backfill.resolve({ ok: true, created: true })
      await backfill.promise
    })

    expect(reloadScopeNav).toHaveBeenCalledTimes(1)
  })

  it('settles without an Atlas agent when loading agents fails', async () => {
    fetchMissionAgentsMock.mockRejectedValue(new Error('agent list unavailable'))
    const reloadScopeNav = vi.fn()

    const { result } = renderHook(() => useBrainVisualizationAtlasAgent(reloadScopeNav))

    await waitFor(() => {
      expect(result.current.atlasAgent).toBeNull()
      expect(result.current.atlasLoading).toBe(false)
    })
    expect(backfillBrainScholarMock).not.toHaveBeenCalled()
    expect(reloadScopeNav).not.toHaveBeenCalled()
  })
})
