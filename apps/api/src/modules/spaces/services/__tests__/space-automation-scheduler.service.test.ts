import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpaceAutomationSchedulerService } from '../space-automation-scheduler.service'

const baseRow = {
  id: 'automation-1',
  space_id: 'space-1',
  user_id: 'user-railway',
  org_id: null,
  enabled: true,
  is_draft: false,
  trigger: {
    type: 'schedule',
    schedule: { mode: 'preset', preset: 'hourly' },
    timezone: 'UTC',
  },
  actions: [{ type: 'create_task', title_template: 'Scheduled task' }],
  schedule_next_fire_at: '2026-06-08T14:00:00.000Z',
}

function buildScheduler(overrides: Record<string, unknown> = {}) {
  const automationsRepo = {
    findSchedulesMissingNextFire: vi.fn().mockResolvedValue([]),
    findDueSchedules: vi.fn().mockResolvedValue([]),
    claimSchedule: vi.fn().mockResolvedValue(true),
    updateScheduleFields: vi.fn().mockResolvedValue(null),
    claimDailyLivenessAlert: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
  const automationService = {
    enqueueAutomationRuntimeJob: vi.fn().mockResolvedValue(false),
    executeAutomationItemless: vi.fn().mockResolvedValue(undefined),
  }
  const configService = { get: vi.fn() }
  const errorReporter = { captureException: vi.fn() }
  const automationRunsRepo = { createOptionalServiceRoleClient: vi.fn().mockReturnValue({}) }
  const service = new SpaceAutomationSchedulerService(
    automationsRepo as never,
    automationService as never,
    configService as never,
    errorReporter as never,
    automationRunsRepo as never,
  )
  return { automationService, automationsRepo, service }
}

describe('SpaceAutomationSchedulerService liveness', () => {
  it('reports a schedule that was silent for more than three intervals', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-11T03:00:00.000Z'))
    const { automationsRepo, automationService } = buildScheduler()
    const liveness = { reportRevived: vi.fn().mockResolvedValue(undefined) }
    const service = new SpaceAutomationSchedulerService(
      automationsRepo as never,
      automationService as never,
      { get: vi.fn() } as never,
      { captureException: vi.fn() } as never,
      { createOptionalServiceRoleClient: vi.fn() } as never,
      liveness as never,
    )

    await (service as any).processOne({} as never, {
      ...baseRow,
      name: 'Pixel team loop',
      schedule_last_fired_at: '2026-08-10T21:00:00.000Z',
    })

    expect(liveness.reportRevived).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ automationId: 'automation-1', missedFires: 5 }),
    )
  })
})

describe('SpaceAutomationSchedulerService runtime routing', () => {
  beforeEach(() => vi.useRealTimers())

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

  it('leaves next-fire untouched when rolling forward hits a transient persistence error', async () => {
    const updateScheduleFields = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient network failure'))
    const { service } = buildScheduler({ updateScheduleFields })

    await expect(
      (service as any).rollNextFireForward({} as never, baseRow),
    ).resolves.toBeUndefined()

    expect(updateScheduleFields).toHaveBeenCalledTimes(1)
    expect(updateScheduleFields).toHaveBeenCalledWith(
      {},
      'space-1',
      'automation-1',
      expect.objectContaining({ schedule_next_fire_at: expect.any(String) }),
    )
    expect(updateScheduleFields).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      { schedule_next_fire_at: null },
    )
  })

  it('clears next-fire only when the saved cron cannot be parsed', async () => {
    const updateScheduleFields = vi.fn().mockResolvedValue(null)
    const { service } = buildScheduler({ updateScheduleFields })
    const invalidRow = {
      ...baseRow,
      trigger: {
        type: 'schedule',
        schedule: { mode: 'custom', cron: 'not a cron' },
        timezone: 'UTC',
      },
    }

    await (service as any).rollNextFireForward({} as never, invalidRow)

    expect(updateScheduleFields).toHaveBeenCalledOnce()
    expect(updateScheduleFields).toHaveBeenCalledWith({}, 'space-1', 'automation-1', {
      schedule_next_fire_at: null,
    })
  })

  it('self-heals enabled schedule rows whose next-fire is null', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-11T03:20:00.000Z'))
    const missingRow = { ...baseRow, schedule_next_fire_at: null }
    const findSchedulesMissingNextFire = vi.fn().mockResolvedValue([missingRow])
    const updateScheduleFields = vi.fn().mockResolvedValue(null)
    const { automationsRepo, service } = buildScheduler({
      findSchedulesMissingNextFire,
      updateScheduleFields,
    })

    await service.processDueSchedules()

    expect(findSchedulesMissingNextFire).toHaveBeenCalledWith({}, 50)
    expect(updateScheduleFields).toHaveBeenCalledWith({}, 'space-1', 'automation-1', {
      schedule_next_fire_at: '2026-08-11T04:00:00.000Z',
    })
    expect(automationsRepo.findDueSchedules).toHaveBeenCalledOnce()
  })

  it('continues scanning due schedules when the repair query transiently fails', async () => {
    const findSchedulesMissingNextFire = vi
      .fn()
      .mockRejectedValue(new Error('transient repair query failure'))
    const { automationsRepo, service } = buildScheduler({ findSchedulesMissingNextFire })

    await service.processDueSchedules()

    expect(automationsRepo.findDueSchedules).toHaveBeenCalledOnce()
  })
})
