import { describe, expect, it, vi } from 'vitest'
import { SpaceTemplatesService } from '../services/space-templates.service'

const scope = { userId: 'user-1', orgId: 'org-1', orgRole: 'editor' as const }
const supabase = {} as never

function buildService(result: {
  space?: Record<string, unknown>
  automations?: Record<string, unknown>[]
}) {
  const templatesRepo = {
    instantiate: vi.fn(async () => ({
      space: result.space ?? { id: 'space-1', title: 'Operations Hub' },
      automations: result.automations ?? [],
    })),
  }
  const automationsRepo = { updateScheduleFields: vi.fn(async () => null) }
  const automationService = { syncExternalTriggerForAutomation: vi.fn(async () => undefined) }
  const schedulerService = { computeInitialNextFireAt: vi.fn<() => Date | null>(() => null) }
  const service = new SpaceTemplatesService(
    templatesRepo as never,
    automationsRepo as never,
    automationService as never,
    schedulerService as never,
  )
  return { service, templatesRepo, automationsRepo, automationService, schedulerService }
}

describe('SpaceTemplatesService.instantiate', () => {
  it('creates a space through the atomic instantiate RPC repository method', async () => {
    const { service, templatesRepo, automationService } = buildService({
      space: { id: 'space-1', title: 'Operations Hub' },
    })

    const result = await service.instantiate(supabase, scope, 'operations-hub', {
      title: 'Ops',
      include_channel: false,
      include_tasks: false,
      include_docs: false,
      include_automations: false,
    })

    expect(result).toEqual({ id: 'space-1', title: 'Operations Hub' })
    expect(templatesRepo.instantiate).toHaveBeenCalledWith(supabase, {
      slug: 'operations-hub',
      title: 'Ops',
      orgId: 'org-1',
      campaignId: undefined,
      visibility: undefined,
      defaultShareLevel: undefined,
      includeTasks: false,
      includeDocs: false,
      includeChannel: false,
      includeAutomations: false,
    })
    expect(automationService.syncExternalTriggerForAutomation).not.toHaveBeenCalled()
  })

  it('syncs returned template automations after the atomic create', async () => {
    const { service, automationService, automationsRepo } = buildService({
      space: { id: 'space-1', title: 'Operations Hub' },
      automations: [{ id: 'automation-1', is_draft: true, enabled: false }],
    })

    await service.instantiate(supabase, scope, 'operations-hub', {
      include_channel: false,
      include_tasks: false,
      include_docs: false,
      include_automations: true,
    })

    expect(automationService.syncExternalTriggerForAutomation).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'org-1',
      'space-1',
      expect.objectContaining({ id: 'automation-1' }),
    )
    expect(automationsRepo.updateScheduleFields).toHaveBeenCalledWith(
      expect.anything(),
      'space-1',
      'automation-1',
      { schedule_next_fire_at: null },
    )
  })

  it('materializes schedule next fire when the returned automation is enabled', async () => {
    const next = new Date('2026-05-20T09:00:00.000Z')
    const { service, automationsRepo, schedulerService } = buildService({
      space: { id: 'space-1', title: 'Operations Hub' },
      automations: [{ id: 'automation-1', is_draft: false, enabled: true }],
    })
    schedulerService.computeInitialNextFireAt.mockReturnValue(next)

    await service.instantiate(supabase, scope, 'operations-hub', {
      include_channel: true,
      include_tasks: true,
      include_docs: true,
      include_automations: true,
    })

    expect(automationsRepo.updateScheduleFields).toHaveBeenCalledWith(
      supabase,
      'space-1',
      'automation-1',
      { schedule_next_fire_at: next.toISOString() },
    )
  })
})
