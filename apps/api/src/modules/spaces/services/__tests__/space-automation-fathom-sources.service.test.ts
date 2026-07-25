import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { chain } from './space-automation-fathom-test-helpers'
import { automationsRepoFromRepo } from './space-automation-test-utils'

describe('SpaceAutomationService Fathom source routing', () => {
  it('fans out user-source rules built by an admin to a sales rep recording', async () => {
    // Admin user "admin_1" built a rule pointing at user_integration "ui_2"
    // (which is owned by sales rep "rep_1"). When rep_1 records, the rule
    // should fire and the run context should be admin_1 (rule creator), not
    // rep_1 (recording owner).
    const createdItem = { id: 'item_admin', title: 'Fathom meeting: Sales call' }
    const route = {
      id: 'route_admin',
      space_id: 'space_admin',
      automation_id: 'automation_admin',
      user_id: 'admin_1', // rule creator
      org_id: 'org_42',
      filters: {},
      source: { mode: 'user', user_integration_id: 'ui_2' },
    }

    const repo = {
      createItem: vi.fn().mockResolvedValue(createdItem),
      createActivity: vi.fn().mockResolvedValue({}),
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_admin',
              name: 'Sales analysis',
              enabled: true,
              trigger: {
                type: 'external_fathom_recording_ready',
                source: { mode: 'user', user_integration_id: 'ui_2' },
              },
              actions: [],
            },
          ],
        },
      }),
      updateSpace: vi.fn().mockResolvedValue({}),
      findItemById: vi.fn().mockResolvedValue(createdItem),
      findItemByFathomMeetingId: vi.fn().mockResolvedValue(null),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }

    let triggerQueryNum = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_external_automation_events') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'event_row_user' }, error: null }),
              }),
            }),
            update: () => ({ eq: async () => ({ error: null }) }),
          }
        }
        if (table === 'space_external_automation_triggers') {
          // 3 calls: self (no match), user (returns route), team (no member)
          triggerQueryNum += 1
          const result =
            triggerQueryNum === 2 ? { data: [route], error: null } : { data: [], error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
          builder.in = () => builder
          builder.then = (resolve: (value: typeof result) => unknown) => resolve(result)
          return builder
        }
        if (table === 'user_integrations') {
          // recording owner rep_1 has fathom integration ui_2
          const result = { data: [{ id: 'ui_2' }], error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
          builder.then = (resolve: (value: typeof result) => unknown) => resolve(result)
          return builder
        }
        if (table === 'agent_team_members') {
          const result = { data: [], error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
          builder.then = (resolve: (value: typeof result) => unknown) => resolve(result)
          return builder
        }
        if (table === 'space_automation_runs') return { insert: async () => ({ error: null }) }
        return chain({ data: null, error: null })
      }),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    const result = await service.processFathomRecordingEvent(supabase as never, 'rep_1', {
      id: 'rec_user_3',
      title: 'Sales call',
    })

    expect(result).toEqual({
      processed: true,
      fanout_count: 1,
      space_id: 'space_admin',
      item_id: 'item_admin',
      automation_id: 'automation_admin',
    })
    // Run identity is rule creator, not recording owner.
    expect(repo.createItem).toHaveBeenCalledWith(
      expect.anything(),
      'admin_1',
      'space_admin',
      expect.objectContaining({
        custom_data: expect.objectContaining({
          external_automation: expect.objectContaining({ fathom_owner_user_id: 'rep_1' }),
        }),
      }),
      'org_42',
    )
  })

  it('fans out team-source rules to recordings from any team member', async () => {
    const createdItem = { id: 'item_team', title: 'Fathom meeting: Demo' }
    const route = {
      id: 'route_team',
      space_id: 'space_team',
      automation_id: 'automation_team',
      user_id: 'admin_1',
      org_id: 'org_42',
      filters: {},
      source: { mode: 'team', team_id: 'team_sales' },
    }

    const repo = {
      createItem: vi.fn().mockResolvedValue(createdItem),
      createActivity: vi.fn().mockResolvedValue({}),
      findSpaceById: vi.fn().mockResolvedValue({
        schema: {
          automations: [
            {
              id: 'automation_team',
              name: 'Sales team analysis',
              enabled: true,
              trigger: {
                type: 'external_fathom_recording_ready',
                source: { mode: 'team', team_id: 'team_sales' },
              },
              actions: [],
            },
          ],
        },
      }),
      updateSpace: vi.fn().mockResolvedValue({}),
      findItemById: vi.fn().mockResolvedValue(createdItem),
      findItemByFathomMeetingId: vi.fn().mockResolvedValue(null),
      findSubtasksByParentId: vi.fn().mockResolvedValue([]),
      findActivityByItemId: vi.fn().mockResolvedValue([]),
    }

    let triggerQueryNum = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_external_automation_events') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'event_row_team' }, error: null }),
              }),
            }),
            update: () => ({ eq: async () => ({ error: null }) }),
          }
        }
        if (table === 'space_external_automation_triggers') {
          // 2 calls: self (no match) and team (match). The user-mode query is
          // skipped because user_integrations returned no rows, so the loop
          // never asks the trigger table for user-source routes.
          triggerQueryNum += 1
          const result =
            triggerQueryNum === 2 ? { data: [route], error: null } : { data: [], error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
          builder.in = () => builder
          builder.then = (resolve: (value: typeof result) => unknown) => resolve(result)
          return builder
        }
        if (table === 'user_integrations') {
          const result = { data: [], error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
          builder.then = (resolve: (value: typeof result) => unknown) => resolve(result)
          return builder
        }
        if (table === 'agent_team_members') {
          // recording owner sales_rep_b is in team_sales
          const result = { data: [{ team_id: 'team_sales' }], error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
          builder.then = (resolve: (value: typeof result) => unknown) => resolve(result)
          return builder
        }
        if (table === 'space_automation_runs') return { insert: async () => ({ error: null }) }
        return chain({ data: null, error: null })
      }),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    const result = await service.processFathomRecordingEvent(supabase as never, 'sales_rep_b', {
      id: 'rec_team_4',
      title: 'Demo',
    })

    expect(result).toEqual({
      processed: true,
      fanout_count: 1,
      space_id: 'space_team',
      item_id: 'item_team',
      automation_id: 'automation_team',
    })
    expect(repo.createItem).toHaveBeenCalledWith(
      expect.anything(),
      'admin_1',
      'space_team',
      expect.anything(),
      'org_42',
    )
  })
})
