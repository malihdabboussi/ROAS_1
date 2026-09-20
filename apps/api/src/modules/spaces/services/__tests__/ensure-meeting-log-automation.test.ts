import { describe, expect, it, vi } from 'vitest'
import { MEETING_LOG_AUTOMATION_SEED } from '../../data/meeting-log-automation.seed'
import { SpaceAutomationServiceBase03 } from '../space-automation-service-03.base'

const supabase = {} as never
const scope = { userId: 'admin_1', orgId: null } as never

/** Runs the base-class method on a hand-built `this`, avoiding the service's 20-dependency constructor. */
function host(overrides: Partial<Record<string, unknown>> = {}) {
  const self = {
    logger: { log: vi.fn(), warn: vi.fn() },
    objectRecord: (value: unknown) =>
      value && typeof value === 'object' && !Array.isArray(value) ? value : {},
    automationsRepo: {
      listBySpace: vi.fn().mockResolvedValue([]),
      create: vi
        .fn()
        .mockResolvedValue({ id: 'auto_new', trigger: MEETING_LOG_AUTOMATION_SEED.trigger }),
    },
    repo: {
      findSpaceByIdForAccess: vi
        .fn()
        .mockResolvedValue({ id: 'space_1', user_id: 'owner_1', org_id: 'org_9' }),
    },
    syncExternalTriggerForAutomation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  return self
}

const run = (self: Record<string, unknown>) =>
  (
    SpaceAutomationServiceBase03.prototype.ensureMeetingLogAutomation as (
      this: unknown,
      supabase: unknown,
      scope: unknown,
      spaceId: string,
    ) => Promise<{ installed: boolean }>
  ).call(self, supabase, scope, 'space_1')

describe('ensureMeetingLogAutomation', () => {
  it('installs the meeting-log rule on a Meetings space that has none, owned by the space owner', async () => {
    const self = host()
    await expect(run(self)).resolves.toEqual({ installed: true })
    expect(self.automationsRepo.create).toHaveBeenCalledWith(
      supabase,
      { id: 'space_1', user_id: 'owner_1', org_id: 'org_9' },
      'admin_1',
      expect.objectContaining({
        name: 'Fathom Meeting Log',
        trigger: { type: 'external_fathom_recording_ready', source: { mode: 'self' } },
        enabled: true,
      }),
    )
    expect(self.syncExternalTriggerForAutomation).toHaveBeenCalledWith(
      supabase,
      'owner_1',
      'org_9',
      'space_1',
      expect.objectContaining({ id: 'auto_new' }),
    )
  })

  it('leaves a space alone when an enabled meeting-log rule already exists', async () => {
    const self = host({
      automationsRepo: {
        listBySpace: vi
          .fn()
          .mockResolvedValue([
            { id: 'a1', enabled: true, trigger: { type: 'external_fathom_recording_ready' } },
          ]),
        create: vi.fn(),
      },
    })
    await expect(run(self)).resolves.toEqual({ installed: false })
    expect(self.automationsRepo.create).not.toHaveBeenCalled()
  })

  it('treats disabled or draft rules as missing', async () => {
    const self = host({
      automationsRepo: {
        listBySpace: vi.fn().mockResolvedValue([
          { id: 'a1', enabled: false, trigger: { type: 'external_fathom_recording_ready' } },
          {
            id: 'a2',
            enabled: true,
            is_draft: true,
            trigger: { type: 'external_fathom_recording_ready' },
          },
          { id: 'a3', enabled: true, trigger: { type: 'schedule' } },
        ]),
        create: vi
          .fn()
          .mockResolvedValue({ id: 'auto_new', trigger: MEETING_LOG_AUTOMATION_SEED.trigger }),
      },
    })
    await expect(run(self)).resolves.toEqual({ installed: true })
  })

  it('does nothing when the space cannot be read', async () => {
    const self = host({ repo: { findSpaceByIdForAccess: vi.fn().mockResolvedValue(null) } })
    await expect(run(self)).resolves.toEqual({ installed: false })
    expect(self.automationsRepo.create).not.toHaveBeenCalled()
  })
})
