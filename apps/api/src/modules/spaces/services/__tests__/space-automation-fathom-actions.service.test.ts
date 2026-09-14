import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { chain } from './space-automation-fathom-test-helpers'
import { automationsRepoFromRepo, emptyAutomationsRepo } from './space-automation-test-utils'

describe('SpaceAutomationService Fathom actions and revocation', () => {
  it('uses authoritative provider actions instead of generating extra Fathom tasks', async () => {
    const parentItem = { id: 'item_parent', title: 'Sales call' }
    const suggestionA = { id: 'suggestion_a', title: 'Follow up with buyer' }
    const suggestionB = { id: 'suggestion_b', title: 'Send recap' }
    const route = {
      id: 'route_admin',
      space_id: 'space_admin',
      automation_id: 'automation_admin',
      user_id: 'admin_1',
      org_id: 'org_42',
      filters: {},
      source: { mode: 'user', user_integration_id: 'ui_2' },
    }
    const createItem = vi
      .fn()
      .mockResolvedValueOnce(parentItem)
      .mockResolvedValueOnce(suggestionA)
      .mockResolvedValueOnce(suggestionB)
    const repo = {
      createItem,
      updateItem: vi.fn().mockResolvedValue({ ...parentItem, title: 'Sales call' }),
      createActivity: vi.fn().mockResolvedValue({}),
      findSpaceById: vi.fn().mockResolvedValue({
        id: 'space_admin',
        title: 'Sales space',
        schema: {},
      }),
      updateSpace: vi.fn().mockResolvedValue({}),
      findItemById: vi.fn().mockResolvedValue(parentItem),
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
                single: async () => ({ data: { id: 'event_row_agent' }, error: null }),
              }),
            }),
            update: () => ({ eq: async () => ({ error: null }) }),
          }
        }
        if (table === 'space_external_automation_triggers') {
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
        if (table === 'profiles' || table === 'org_members') {
          const result = { data: null, error: null }
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
          builder.ilike = () => builder
          builder.maybeSingle = async () => result
          return builder
        }
        if (table === 'space_automation_runs') return { insert: async () => ({ error: null }) }
        return chain({ data: null, error: null })
      }),
    }
    const userAgentApi = {
      invoke: vi.fn().mockImplementation(async (_userId: string, path: string) => {
        if (path.includes('suggest-meeting-title')) {
          return {
            ok: true,
            json: async () => ({ title: 'Sales call' }),
          }
        }
        return {
          ok: true,
          json: async () => ({
            tasks: [
              { title: 'Follow up with buyer', description: 'Send the pricing deck.' },
              { title: 'Send recap ASAP', priority: 'medium' },
            ],
          }),
        }
      }),
    }
    const meetingSourceIngestion = {
      findMatchingMeetingItem: vi.fn().mockResolvedValue(null),
      ingestMeetingSource: vi.fn().mockResolvedValue({
        recording_id: 'recording-1',
        transcript_doc_item_id: 'transcript-1',
        provider_action_ids: ['provider-action-1'],
        primary_recording_id: 'recording-1',
      }),
    }
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo({
        ...repo,
        findSpaceById: vi.fn().mockResolvedValue({
          id: 'space_admin',
          title: 'Sales space',
          schema: {
            automations: [
              {
                id: 'automation_admin',
                name: 'Suggest tasks',
                enabled: true,
                trigger: {
                  type: 'external_fathom_recording_ready',
                  source: { mode: 'user', user_integration_id: 'ui_2' },
                },
                actions: [{ type: 'agent_suggest_tasks', agent_key: 'vibey', max_suggestions: 2 }],
              },
            ],
          },
        }),
        updateSpace: vi.fn().mockResolvedValue({}),
      }) as never,
      { get: () => 'internal-token' } as never,
      {} as never,
      undefined,
      undefined,
      undefined,
      userAgentApi as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      meetingSourceIngestion as never,
    )

    const result = await service.processFathomRecordingEvent(supabase as never, 'rep_1', {
      id: 'rec_agent',
      title: 'Sales call',
      transcript: [{ speaker: { display_name: 'Rep' }, text: 'We need a follow-up.' }],
      default_summary: { markdown_formatted: 'Summary' },
      action_items: [{ description: 'Send pricing deck' }],
    })

    expect(result).toMatchObject({ processed: true, fanout_count: 1 })
    expect(userAgentApi.invoke).toHaveBeenCalledWith(
      'admin_1',
      '/api/agents/suggest-meeting-title',
      expect.objectContaining({
        method: 'POST',
      }),
      expect.anything(),
    )
    expect(userAgentApi.invoke).not.toHaveBeenCalledWith(
      expect.anything(),
      '/api/agents/suggest-tasks',
      expect.anything(),
      expect.anything(),
    )
    expect(createItem).toHaveBeenCalledTimes(1)
    expect(meetingSourceIngestion.ingestMeetingSource).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        meetingItemId: 'item_parent',
        spaceId: 'space_admin',
        userId: 'admin_1',
      }),
    )
  })

  it('revokeFathomDependentRules disables matching rules and notifies creators on disconnect', async () => {
    const userRow = {
      id: 'route_user',
      space_id: 'space_admin',
      automation_id: 'automation_admin',
      user_id: 'admin_1',
      org_id: 'org_42',
      source: { mode: 'user', user_integration_id: 'ui_target' },
    }
    const selfRow = {
      id: 'route_self',
      space_id: 'space_owner',
      automation_id: 'automation_owner',
      user_id: 'rep_1',
      org_id: 'org_42',
      source: { mode: 'self' },
    }
    const automationDetails = [
      {
        id: 'automation_admin',
        created_by: 'admin_1',
        name: 'Admin rule',
        space_id: 'space_admin',
        org_id: 'org_42',
      },
      {
        id: 'automation_owner',
        created_by: 'rep_1',
        name: 'Self rule',
        space_id: 'space_owner',
        org_id: 'org_42',
      },
    ]

    let triggerSelectNum = 0
    const triggerUpdateChain = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    })
    const automationUpdateChain = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const notificationsInsert = vi.fn().mockResolvedValue({ error: null })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_external_automation_triggers') {
          // Two SELECT calls then one UPDATE call.
          if (triggerUpdateChain.mock.calls.length === 0) {
            triggerSelectNum += 1
            const result =
              triggerSelectNum === 1
                ? { data: [userRow], error: null }
                : { data: [selfRow], error: null }
            const builder: Record<string, unknown> = {}
            builder.select = () => builder
            builder.eq = () => builder
            builder.in = () => builder
            builder.then = (resolve: (value: typeof result) => unknown) => resolve(result)
            return Object.assign(builder, { update: triggerUpdateChain })
          }
          return { update: triggerUpdateChain }
        }
        if (table === 'space_automations') {
          if (automationUpdateChain.mock.calls.length === 2) {
            // After both per-rule updates, we issue the bulk SELECT for details.
            const result = { data: automationDetails, error: null }
            const builder: Record<string, unknown> = {}
            builder.select = () => builder
            builder.in = () => builder
            builder.then = (resolve: (value: typeof result) => unknown) => resolve(result)
            return builder
          }
          return { update: automationUpdateChain }
        }
        if (table === 'user_notifications') {
          return { insert: notificationsInsert }
        }
        return {}
      }),
    }

    const service = new SpaceAutomationService(
      {} as never,
      emptyAutomationsRepo() as never,
      {} as never,
      {} as never,
    )

    const result = await service.revokeFathomDependentRules(supabase as never, {
      fathomOwnerUserId: 'rep_1',
      userIntegrationId: 'ui_target',
      mode: 'disconnect',
      reason: 'Fathom owner disconnected',
    })

    expect(result.disabled_automation_ids.sort()).toEqual(['automation_admin', 'automation_owner'])
    expect(triggerUpdateChain).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'disabled', last_error: 'Fathom owner disconnected' }),
    )
    expect(automationUpdateChain).toHaveBeenCalledTimes(2)
    expect(notificationsInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: 'admin_1',
          type: 'space_automation_disabled',
          title: 'Automation disabled: Admin rule',
        }),
        expect.objectContaining({
          user_id: 'rep_1',
          type: 'space_automation_disabled',
          title: 'Automation disabled: Self rule',
        }),
      ]),
    )
  })

  it('restoreFathomDependentRules re-enables only rules disabled by the matching disconnect', async () => {
    const disabledReason = 'The Fathom account that fed this automation was disconnected.'
    const rows = [
      {
        id: 'route_self',
        automation_id: 'automation_self',
        source: { mode: 'self' },
      },
      {
        id: 'route_user',
        automation_id: 'automation_user',
        source: { mode: 'user', user_integration_id: 'integration_1' },
      },
    ]
    const triggerUpdate = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    })
    const automationUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_external_automation_triggers') {
          const builder: Record<string, unknown> = {}
          builder.select = () => builder
          builder.eq = () => builder
          builder.or = () => builder
          builder.then = (resolve: (value: unknown) => unknown) =>
            resolve({ data: rows, error: null })
          return Object.assign(builder, { update: triggerUpdate })
        }
        if (table === 'space_automations') return { update: automationUpdate }
        return {}
      }),
    }
    const service = new SpaceAutomationService(
      {} as never,
      emptyAutomationsRepo() as never,
      {} as never,
      {} as never,
    )

    const result = await service.restoreFathomDependentRules(supabase as never, {
      fathomOwnerUserId: 'user_1',
      userIntegrationId: 'integration_1',
      disabledReason,
    })

    expect(result.restored_automation_ids.sort()).toEqual(['automation_self', 'automation_user'])
    expect(triggerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', last_error: null }),
    )
    expect(automationUpdate).toHaveBeenCalledTimes(2)
  })

  it('dedupes repeated Fathom recording webhook events', async () => {
    const existing = { id: 'event-1', status: 'processed' }
    const supabase = {
      from: vi.fn(() => {
        const builder: Record<string, unknown> = {}
        builder.insert = () => ({
          select: () => ({
            single: async () => ({ error: { code: '23505', message: 'duplicate' } }),
          }),
        })
        builder.select = () => builder
        builder.eq = () => builder
        builder.maybeSingle = async () => ({ data: existing, error: null })
        return builder
      }),
    }
    const service = new SpaceAutomationService(
      {} as never,
      emptyAutomationsRepo() as never,
      {} as never,
      {} as never,
    )

    const result = await service.processFathomRecordingEvent(supabase as never, 'user_1', {
      id: 'rec_1',
      title: 'Demo call',
    })

    expect(result).toEqual({ processed: false, duplicate: true, status: 'processed' })
  })
})
