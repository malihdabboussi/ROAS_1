import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationSchedulerService } from '../space-automation-scheduler.service'

describe('SpaceAutomationSchedulerService runtime routing', () => {
  it('does not pre-wake Fly before scheduled agent actions', async () => {
    const automationsRepo = {
      claimSchedule: vi.fn().mockResolvedValue(true),
      updateScheduleFields: vi.fn().mockResolvedValue(null),
    }
    const automationService = {
      executeAutomationItemless: vi.fn().mockResolvedValue(undefined),
    }
    const configService = { get: vi.fn() }
    const machinesService = { ensureRunning: vi.fn().mockResolvedValue({}) }
    const service = new (SpaceAutomationSchedulerService as any)(
      automationsRepo,
      automationService,
      configService,
      machinesService,
    )

    const admin = {} as never
    const row = {
      id: 'automation-1',
      space_id: 'space-1',
      user_id: 'user-railway',
      org_id: null,
      trigger: {
        type: 'schedule',
        schedule: { mode: 'preset', preset: 'hourly' },
        timezone: 'UTC',
      },
      actions: [
        { type: 'create_task', title_template: 'Scheduled task' },
        { type: 'send_to_agent', agent_key: 'vibey', prompt_template: 'Do work' },
      ],
      schedule_next_fire_at: '2026-06-08T14:00:00.000Z',
    }

    await (service as any).processOne(admin, row)

    expect(machinesService.ensureRunning).not.toHaveBeenCalled()
    expect(automationService.executeAutomationItemless).toHaveBeenCalledWith(
      row,
      expect.objectContaining({ type: 'schedule' }),
      {
        supabase: admin,
        userId: 'user-railway',
        orgId: null,
        spaceId: 'space-1',
        depth: 0,
      },
    )
  })
})
