import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissionAvatarService } from '../services/media/mission-avatar.service'
import { InternalAgentsController } from './internal-agents.controller'

describe('InternalAgentsController backfillAvatars', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads eligible agents, generates avatars, and counts failures', async () => {
    vi.useFakeTimers()
    const nonVibeyAgent = {
      user_id: 'user-1',
      agent_key: 'atlas',
      name: 'Atlas',
      role: 'Researcher',
      org_id: null,
    }
    const vibeyAgent = {
      user_id: 'user-2',
      agent_key: 'vibey',
      name: 'Vibey',
      role: 'CEO',
      org_id: 'org-1',
    }
    const nonVibeyQuery = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      neq: vi.fn().mockResolvedValue({ data: [nonVibeyAgent], error: null }),
    }
    let vibeyEqCalls = 0
    const vibeyQuery = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn(() => {
        vibeyEqCalls++
        return vibeyEqCalls === 3
          ? Promise.resolve({ data: [vibeyAgent], error: null })
          : vibeyQuery
      }),
    }
    const supabase = {
      from: vi.fn().mockReturnValueOnce(nonVibeyQuery).mockReturnValueOnce(vibeyQuery),
    } as any
    const missionAvatarService = new MissionAvatarService({} as any, {} as any)
    vi.spyOn(missionAvatarService, 'generateAgentAvatar')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('avatar failed'))
    const controller = new InternalAgentsController(
      {} as any,
      {} as any,
      { getServiceRoleClient: vi.fn(() => supabase) } as any,
      missionAvatarService,
    )

    const resultPromise = controller.backfillAvatars()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(nonVibeyQuery.in).toHaveBeenCalledWith('level', [
      'c_level',
      'system',
      'employee',
      'manager',
    ])
    expect(nonVibeyQuery.neq).toHaveBeenCalledWith('agent_key', 'vibey')
    expect(vibeyQuery.eq).toHaveBeenCalledWith('config->>avatar_mode', 'portrait')
    expect(missionAvatarService.generateAgentAvatar).toHaveBeenCalledWith(
      'user-1',
      'atlas',
      'Atlas',
      'Researcher',
      null,
    )
    expect(missionAvatarService.generateAgentAvatar).toHaveBeenCalledWith(
      'user-2',
      'vibey',
      'Vibey',
      'CEO',
      'org-1',
    )
    expect(result).toEqual({ ok: true, processed: 1, failed: 1 })
  })
})
