import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { MissionsTrackService } from '../missions-track.service'

const missionId = '00000000-0000-4000-8000-000000000001'
const ownerId = '00000000-0000-4000-8000-000000000002'
const orgId = '00000000-0000-4000-8000-000000000003'
const subtaskId = '00000000-0000-4000-8000-000000000010'

function createService(overrides?: {
  mission?: Record<string, unknown>
  subtasks?: Array<{ title: string }>
  agents?: Array<{ agent_key: string; name?: string; role?: string }>
}) {
  const mission = overrides?.mission ?? {
    id: missionId,
    user_id: ownerId,
    title: 'Claude Club Pre-Call Strategy Map',
    input: { playbook_id: 'client-strategy' },
  }
  const lifecycle = {
    getById: vi.fn().mockResolvedValue(mission),
  }
  const repository = {
    listSubtasks: vi
      .fn()
      .mockResolvedValue(overrides?.subtasks ?? [{ title: 'Task 2 — Pre-call strategy map' }]),
    listOrgAgents: vi.fn().mockResolvedValue(
      overrides?.agents ?? [
        { agent_key: 'atlas', name: 'Atlas' },
        { agent_key: 'nate', name: 'Nate', role: 'Agency Strategist' },
      ],
    ),
  }
  const internal = {
    managerAppendSubtasks: vi.fn().mockResolvedValue({ ok: true, appended: 2 }),
    managerRetrySubtask: vi.fn().mockResolvedValue({ ok: true }),
  }
  const service = new MissionsTrackService(
    lifecycle as never,
    internal as never,
    repository as never,
  )
  return { service, lifecycle, repository, internal, mission }
}

describe('MissionsTrackService', () => {
  it('appends post-call subtasks on the same mission with a stable idempotency key', async () => {
    const { service, internal, repository } = createService()
    const supabase = {} as never

    await service.extend(supabase, ownerId, missionId, 'post-call-strategy', orgId, 'owner')

    expect(repository.listOrgAgents).toHaveBeenCalledWith(supabase, ownerId, orgId)
    expect(internal.managerAppendSubtasks).toHaveBeenCalledWith(
      expect.objectContaining({
        mission_id: missionId,
        user_id: ownerId,
        org_id: orgId,
        idempotency_key: `mission-extend:${missionId}:post-call-strategy`,
      }),
    )
    const dto = internal.managerAppendSubtasks.mock.calls[0]?.[0]
    expect(dto.subtasks).toHaveLength(2)
    expect(dto.subtasks[1].dependsOn).toEqual(['st-atlas-transcript'])
  })

  it('rejects webinar fulfillment and already-extended client strategy tracks', async () => {
    const webinar = createService({
      mission: {
        id: missionId,
        user_id: ownerId,
        title: 'Webinar Fulfillment',
        input: { playbook_id: 'webinar-fulfillment' },
      },
    })
    await expect(
      webinar.service.extend({} as never, ownerId, missionId, 'post-call-strategy', orgId, 'owner'),
    ).rejects.toBeInstanceOf(BadRequestException)

    const extended = createService({
      subtasks: [{ title: 'Task 4 — Post-call strategy map' }],
    })
    await expect(
      extended.service.extend(
        {} as never,
        ownerId,
        missionId,
        'post-call-strategy',
        orgId,
        'owner',
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(extended.internal.managerAppendSubtasks).not.toHaveBeenCalled()
  })

  it('retries a subtask as the mission owner after an edit-access check', async () => {
    const { service, lifecycle, internal } = createService()
    const supabase = {} as never

    await service.retrySubtask(supabase, 'editor-user', missionId, subtaskId, orgId, 'editor')

    expect(lifecycle.getById).toHaveBeenCalledWith(
      supabase,
      'editor-user',
      missionId,
      orgId,
      'editor',
      'edit',
    )
    expect(internal.managerRetrySubtask).toHaveBeenCalledWith({
      mission_id: missionId,
      user_id: ownerId,
      org_id: orgId,
      subtask_id: subtaskId,
    })
  })
})
