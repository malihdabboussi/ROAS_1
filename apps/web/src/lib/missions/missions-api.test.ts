import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import {
  createMission,
  fetchDeliverablesForMissions,
  fetchMissionById,
  fetchMissions,
  fetchSubtasks,
} from './missions-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPostMock = vi.mocked(backendPost)

const mission = {
  id: 'mission-1',
  user_id: 'user-1',
  parent_mission_id: null,
  campaign_id: null,
  title: 'Mission',
  brief: null,
  description: null,
  status: 'done',
  priority: 'medium',
  assigned_agent_key: null,
  current_agent_key: null,
  progress_notes: null,
  plan_id: null,
  correlation_id: 'correlation-1',
  idempotency_key: 'idempotency-1',
  retry_count: 0,
  input: {},
  output: {},
  error: null,
  scheduled_at: null,
  created_at: '2026-06-20T00:00:00.000Z',
  updated_at: '2026-06-22T18:00:00.000Z',
  started_at: null,
  completed_at: '2026-06-22T18:00:00.000Z',
}

describe('fetchMissionById', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
  })

  it('passes org context when provided', async () => {
    backendGetMock.mockResolvedValue(mission)

    await expect(fetchMissionById('mission-1', { orgId: 'org-1' })).resolves.toEqual(mission)

    expect(backendGetMock).toHaveBeenCalledWith('/api/missions/mission-1', { orgId: 'org-1' })
  })

  it('keeps the legacy personal retry when no org context is provided', async () => {
    backendGetMock.mockRejectedValueOnce(new Error('Mission not found'))
    backendGetMock.mockResolvedValueOnce(mission)

    await expect(fetchMissionById('mission-1')).resolves.toEqual(mission)

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/missions/mission-1', undefined)
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/missions/mission-1', { orgId: null })
  })
})

describe('fetchMissions', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
  })

  it('uses the existing mission list query parameters', async () => {
    backendGetMock.mockResolvedValue([mission])

    await expect(fetchMissions({ campaign_id: 'campaign-1', limit: 200 })).resolves.toEqual([
      mission,
    ])

    expect(backendGetMock).toHaveBeenCalledWith('/api/missions?limit=200&campaign_id=campaign-1')
  })

  it('keeps the default list limit', async () => {
    backendGetMock.mockResolvedValue([mission])

    await expect(fetchMissions()).resolves.toEqual([mission])

    expect(backendGetMock).toHaveBeenCalledWith('/api/missions?limit=50')
  })
})

describe('createMission', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
  })

  it('posts the existing create mission payload to the missions endpoint', async () => {
    const input = {
      title: 'Launch task',
      brief: 'Launch task',
      priority: 'medium' as const,
      campaign_id: 'campaign-1',
      input: { attachments: [{ url: 'https://cdn.example.com/brief.pdf' }] },
      idempotency_key: 'mission-idempotency',
    }
    backendPostMock.mockResolvedValue(mission)

    await expect(createMission(input)).resolves.toEqual(mission)

    expect(backendPostMock).toHaveBeenCalledWith('/api/missions', input)
  })
})

describe('fetchDeliverablesForMissions', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
  })

  it('keeps the existing batch lookup and groups deliverables by mission id', async () => {
    const deliverables = [
      {
        id: 'deliverable-1',
        mission_id: 'mission-1',
        user_id: 'user-1',
        agent_key: 'atlas',
        type: 'doc',
        title: 'Doc',
        content: null,
        file_url: null,
        file_name: null,
        file_size: null,
        mime_type: null,
        metadata: {},
        created_at: '2026-06-22T18:00:00.000Z',
      },
      {
        id: 'deliverable-2',
        mission_id: 'mission-2',
        user_id: 'user-1',
        agent_key: 'atlas',
        type: 'image',
        title: 'Image',
        content: null,
        file_url: null,
        file_name: null,
        file_size: null,
        mime_type: null,
        metadata: {},
        created_at: '2026-06-22T18:01:00.000Z',
      },
    ]
    backendGetMock.mockResolvedValue(deliverables)

    await expect(fetchDeliverablesForMissions(['mission-1', 'mission-2'])).resolves.toEqual({
      'mission-1': [deliverables[0]],
      'mission-2': [deliverables[1]],
    })

    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/missions/deliverables/batch?mission_ids=mission-1,mission-2',
    )
  })

  it('keeps the existing empty and failed lookup fallbacks', async () => {
    await expect(fetchDeliverablesForMissions([])).resolves.toEqual({})
    expect(backendGetMock).not.toHaveBeenCalled()

    backendGetMock.mockRejectedValue(new Error('network failed'))

    await expect(fetchDeliverablesForMissions(['mission-1'])).resolves.toEqual({})
  })
})

describe('fetchSubtasks', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
  })

  it('fetches subtasks from the existing mission endpoint', async () => {
    const subtasks = [
      {
        id: 'subtask-1',
        mission_id: 'mission-1',
        user_id: 'user-1',
        title: 'Draft copy',
        status: 'pending',
        assigned_agent_key: 'atlas',
        assignee_type: 'agent',
        assigned_user_id: null,
        awaiting_human_since: null,
        sla_escalate_at: null,
        sla_escalated_at: null,
        bounce_reason: null,
        sort_order: 1,
        depends_on: [],
        output: {},
        feedback: null,
        deliverable_id: null,
        scheduled_at: null,
        created_at: '2026-06-22T18:00:00.000Z',
        updated_at: '2026-06-22T18:00:00.000Z',
      },
    ]
    backendGetMock.mockResolvedValue(subtasks)

    await expect(fetchSubtasks('mission-1')).resolves.toEqual(subtasks)

    expect(backendGetMock).toHaveBeenCalledWith('/api/missions/mission-1/subtasks')
  })
})
