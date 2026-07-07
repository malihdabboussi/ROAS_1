import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'
import { automationsRepoFromRepo, emptyAutomationsRepo } from './space-automation-test-utils'

function chain(result: unknown) {
  const api: Record<string, unknown> = {
    select: () => api,
    eq: () => api,
    single: async () => result,
    maybeSingle: async () => result,
    update: () => api,
    insert: () => api,
  }
  return api
}

function buildProcessAppSupabase(route: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'space_external_automation_events') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'event_row_1' }, error: null }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      if (table === 'space_external_automation_triggers') {
        return {
          select: () => ({
            eq: () => ({ eq: () => chain({ data: route, error: null }) }),
          }),
        }
      }
      if (table === 'space_automation_runs') return { insert: async () => ({ error: null }) }
      return chain({ data: null, error: null })
    }),
  }
}

describe('SpaceAutomationService external app events', () => {
  it('syncs Composio trigger for googlecalendar starting-soon slug', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_external_automation_triggers') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            upsert,
            update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
          }
        }
        if (table === 'space_contact_automation_routes') {
          return { update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }
        }
        return chain({ data: null, error: null })
      }),
    }
    const composio = {
      createTrigger: vi.fn().mockResolvedValue({ triggerId: 'trigger_cal_1' }),
    }
    const service = new SpaceAutomationService(
      {} as never,
      emptyAutomationsRepo() as never,
      {} as never,
      composio as never,
    )

    await service.syncExternalTriggerForAutomation(supabase as never, 'user_1', null, 'space_1', {
      id: 'automation_cal',
      enabled: true,
      is_draft: false,
      created_by: 'user_1',
      trigger: {
        type: 'external_app_event',
        provider: 'googlecalendar',
        trigger_slug: 'GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER',
        connected_account_id: 'ca_cal',
      },
    })

    expect(composio.createTrigger).toHaveBeenCalledWith(
      'user_1',
      'GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER',
      {
        connectedAccountId: 'ca_cal',
        triggerConfig: {},
      },
    )
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'googlecalendar',
        trigger_slug: 'GOOGLECALENDAR_EVENT_STARTING_SOON_TRIGGER',
        connected_account_id: 'ca_cal',
      }),
      { onConflict: 'space_id,automation_id' },
    )
  })

  it('passes connected-app trigger_config through to Composio', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_external_automation_triggers') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            upsert,
            update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
          }
        }
        if (table === 'space_contact_automation_routes') {
          return { update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }
        }
        return chain({ data: null, error: null })
      }),
    }
    const composio = {
      createTrigger: vi.fn().mockResolvedValue({ triggerId: 'trigger_sheet_1' }),
    }
    const service = new SpaceAutomationService(
      {} as never,
      emptyAutomationsRepo() as never,
      {} as never,
      composio as never,
    )

    await service.syncExternalTriggerForAutomation(supabase as never, 'user_1', null, 'space_1', {
      id: 'automation_sheet',
      enabled: true,
      is_draft: false,
      created_by: 'user_1',
      trigger: {
        type: 'external_app_event',
        provider: 'googlesheets',
        trigger_slug: 'GOOGLESHEETS_NEW_ROWS_TRIGGER',
        connected_account_id: 'ca_sheet',
        trigger_config: { spreadsheet_id: 'sheet_1' },
      },
    })

    expect(composio.createTrigger).toHaveBeenCalledWith('user_1', 'GOOGLESHEETS_NEW_ROWS_TRIGGER', {
      connectedAccountId: 'ca_sheet',
      triggerConfig: { spreadsheet_id: 'sheet_1' },
    })
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'googlesheets',
        filters: {},
      }),
      { onConflict: 'space_id,automation_id' },
    )
  })

  it('processes googledrive file-created webhook as external_app_event', async () => {
    const route = {
      id: 'route_drive',
      space_id: 'space_1',
      automation_id: 'automation_drive',
      user_id: 'user_1',
      org_id: null,
      filters: {},
    }
    const repo = {
      createItem: vi.fn(),
      createActivity: vi.fn(),
      findSpaceById: vi.fn().mockResolvedValue({ schema: {} }),
    }
    const supabase = buildProcessAppSupabase(route)
    const service = new SpaceAutomationService(
      repo as never,
      automationsRepoFromRepo(repo) as never,
      {} as never,
      {} as never,
    )

    const executeSpy = vi.spyOn(service, 'executeAutomationById').mockResolvedValue(null)

    const payload = { file_id: 'abc', name: 'Deck.pdf' }
    const result = await service.processComposioExternalEvent(supabase as never, {
      id: 'evt_drive_1',
      metadata: {
        trigger_slug: 'GOOGLEDRIVE_FILE_CREATED_TRIGGER',
        trigger_id: 'ti_drive',
        connected_account_id: 'ca_drive',
      },
      data: payload,
    })

    expect(result).toEqual({
      processed: true,
      item_id: null,
      automation_id: 'automation_drive',
    })
    expect(executeSpy).toHaveBeenCalledWith(
      'automation_drive',
      expect.objectContaining({
        type: 'external_app_event',
        provider: 'googledrive',
        provider_label: 'Google Drive',
        trigger_slug: 'GOOGLEDRIVE_FILE_CREATED_TRIGGER',
        event_label: 'File created',
        connected_account_id: 'ca_drive',
        payload,
      }),
      expect.objectContaining({ itemId: '', spaceId: 'space_1' }),
    )
    executeSpy.mockRestore()
  })

  it('returns unsupported_or_missing_metadata for unknown trigger slugs', async () => {
    const service = new SpaceAutomationService(
      {} as never,
      emptyAutomationsRepo() as never,
      {} as never,
      {} as never,
    )

    const result = await service.processComposioExternalEvent({ from: vi.fn() } as never, {
      id: 'evt_unknown',
      metadata: {
        trigger_slug: 'STRIPE_CHECKOUT_COMPLETED',
        trigger_id: 'ti_x',
        connected_account_id: 'ca_x',
      },
      data: {},
    })

    expect(result).toEqual({ processed: false, reason: 'unsupported_or_missing_metadata' })
  })
})
