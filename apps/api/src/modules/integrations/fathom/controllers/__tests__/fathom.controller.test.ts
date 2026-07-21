import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FathomWebhookService } from '../../services/fathom-webhook.service'
import { FathomController } from '../fathom.controller'

const adminMock = vi.hoisted(() => {
  const upserts: Array<{ table: string; rows: unknown; options: unknown }> = []
  const rowsByTable = new Map<string, unknown[]>()
  const makeChain = (table: string) => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      limit: () => chain,
      update: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      upsert: async (rows: unknown, options: unknown) => {
        upserts.push({ table, rows, options })
        return { error: null }
      },
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: rowsByTable.get(table) ?? [], error: null }).then(resolve),
    }
    return chain
  }
  return { rowsByTable, upserts, makeChain }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => adminMock.makeChain(table),
    auth: { admin: { getUserById: async () => ({ data: { user: null } }) } },
  }),
}))

describe('FathomController behavior', () => {
  let oauth: any
  let api: any
  let importJobs: any
  let customerBrain: any
  let spaceAutomation: any
  let fathomRepository: any
  let controller: FathomController
  let webhookService: FathomWebhookService

  beforeEach(() => {
    oauth = {
      getStatus: vi.fn(),
      updateAutoIngest: vi.fn(),
      ensureMeetingsSpace: vi.fn(),
      getAuthorizationUrl: vi.fn(),
      handleCallback: vi.fn(),
      disconnect: vi.fn(),
    }

    api = {
      resolveUserByWebhookSecret: vi.fn(),
      getAutoIngest: vi.fn(),
      getAutoIngestSettings: vi.fn(),
      listMeetings: vi.fn(),
      getRecordingTranscript: vi.fn(),
      createWebhook: vi.fn(),
      listWebhooks: vi.fn(),
      deleteWebhook: vi.fn(),
    }

    importJobs = {
      enqueueFathomMeetingImport: vi.fn(),
    }

    customerBrain = {
      listEnabledCustomerBrainsForOwner: vi.fn().mockResolvedValue([]),
      listEnabledCustomerBrainsForRouting: vi.fn().mockResolvedValue([]),
    }

    spaceAutomation = {
      processFathomRecordingEvent: vi.fn().mockResolvedValue({ processed: false }),
    }

    fathomRepository = {
      getServiceClient: vi.fn(() => ({
        from: (table: string) => adminMock.makeChain(table),
      })),
      getFathomAliases: vi.fn().mockResolvedValue([]),
      getProfileIdentity: vi.fn().mockResolvedValue(null),
      updateFathomAliases: vi.fn().mockResolvedValue(null),
      enqueueBrainOpsOutboxRows: vi.fn(async (rows: unknown) => {
        adminMock.upserts.push({
          table: 'brain_ops_outbox',
          rows,
          options: { onConflict: 'dedupe_key', ignoreDuplicates: true },
        })
        return null
      }),
      listConnectedIntegrationUserIds: vi.fn(async () => ({
        data: (adminMock.rowsByTable.get('user_integrations') ?? []) as Array<{ user_id: string }>,
        error: null,
      })),
      listProfilesForUserIds: vi.fn(async (userIds: string[]) =>
        (adminMock.rowsByTable.get('profiles') ?? []).filter((profile: any) =>
          userIds.includes(profile.id),
        ),
      ),
    }

    controller = new FathomController(oauth)
    webhookService = new FathomWebhookService(
      api,
      importJobs,
      customerBrain,
      spaceAutomation,
      fathomRepository,
    )
    adminMock.upserts.length = 0
    adminMock.rowsByTable.clear()
  })

  it('returns the idempotent Meetings Space bootstrap result', async () => {
    oauth.ensureMeetingsSpace.mockResolvedValue({ id: 'meetings-1', action: 'reuse' })

    await expect(
      controller.ensureMeetingsSpace({} as never, { id: 'user_1' }, {
        userId: 'user_1',
        orgId: null,
      } as never),
    ).resolves.toEqual({
      success: true,
      space: { id: 'meetings-1', action: 'reuse' },
    })
  })

  it('skips ingestion when auto-ingest is disabled', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_1')
    api.getAutoIngestSettings.mockResolvedValue({
      autoIngest: false,
      billingScope: 'personal',
      billingOrgId: null,
    })

    const event = {
      id: 'meeting_1',
      title: 'Meeting',
      transcript: [{ speaker: { display_name: 'A' }, text: 'hello', timestamp: '1' }],
    }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_1')

    expect(api.getAutoIngestSettings).toHaveBeenCalledWith('user_1')
    expect(importJobs.enqueueFathomMeetingImport).not.toHaveBeenCalled()
  })

  it('ingests transcript when auto-ingest is enabled', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_2')
    api.getAutoIngestSettings.mockResolvedValue({
      autoIngest: true,
      billingScope: 'personal',
      billingOrgId: null,
    })
    importJobs.enqueueFathomMeetingImport.mockResolvedValue({
      jobId: 'job-1',
      status: 'queued',
      deduped: false,
    })

    const event = {
      id: 'meeting_2',
      title: 'Strategy call',
      transcript: [
        {
          speaker: { display_name: 'Founder' },
          text: 'Important decision',
          timestamp: '2026-03-03T10:00:00Z',
        },
      ],
      default_summary: { markdown_formatted: 'summary text' },
      action_items: [{ description: 'Do next step' }],
    }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_2')

    expect(importJobs.enqueueFathomMeetingImport).toHaveBeenCalledWith(
      'user_2',
      expect.objectContaining({
        id: 'meeting_2',
        title: 'Strategy call',
        default_summary: { markdown_formatted: 'summary text' },
        action_items: [{ description: 'Do next step' }],
      }),
      null,
    )
  })

  it('charges selected org when webhook billing is org scoped', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_org')
    api.getAutoIngestSettings.mockResolvedValue({
      autoIngest: true,
      billingScope: 'org',
      billingOrgId: 'org_1',
    })
    importJobs.enqueueFathomMeetingImport.mockResolvedValue({
      jobId: 'job-org',
      status: 'queued',
      deduped: false,
    })

    const event = {
      id: 'meeting_org',
      title: 'Org meeting',
      transcript: [{ speaker: { display_name: 'A' }, text: 'hello', timestamp: '1' }],
    }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_org')

    expect(importJobs.enqueueFathomMeetingImport).toHaveBeenCalledWith(
      'user_org',
      expect.objectContaining({ id: 'meeting_org' }),
      'org_1',
    )
  })

  it('routes customer brain webhook work only to the selected org brain', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_org')
    api.getAutoIngestSettings.mockResolvedValue({
      autoIngest: true,
      billingScope: 'org',
      billingOrgId: 'org_1',
    })
    importJobs.enqueueFathomMeetingImport.mockResolvedValue({
      jobId: 'job-org',
      status: 'queued',
      deduped: false,
    })
    customerBrain.listEnabledCustomerBrainsForRouting.mockResolvedValue([
      { id: 'customer-brain-org', owner_id: 'user_org', org_id: 'org_1', cortex_max: true },
    ])

    const event = {
      id: 'meeting_org',
      title: 'Org meeting',
      transcript: [{ speaker: { display_name: 'A' }, text: 'hello', timestamp: '1' }],
    }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_org')

    expect(customerBrain.listEnabledCustomerBrainsForRouting).toHaveBeenCalledWith('user_org', {
      orgId: 'org_1',
    })
  })

  it('routes customer brain webhook work only to the personal brain for personal billing', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_personal')
    api.getAutoIngestSettings.mockResolvedValue({
      autoIngest: true,
      billingScope: 'personal',
      billingOrgId: null,
    })
    importJobs.enqueueFathomMeetingImport.mockResolvedValue({
      jobId: 'job-personal',
      status: 'queued',
      deduped: false,
    })
    customerBrain.listEnabledCustomerBrainsForRouting.mockResolvedValue([
      { id: 'customer-brain-personal', owner_id: 'user_personal', org_id: null, cortex_max: true },
    ])

    const event = {
      id: 'meeting_personal',
      title: 'Personal meeting',
      transcript: [{ speaker: { display_name: 'A' }, text: 'hello', timestamp: '1' }],
    }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_personal')

    expect(customerBrain.listEnabledCustomerBrainsForRouting).toHaveBeenCalledWith(
      'user_personal',
      {
        orgId: null,
      },
    )
  })

  it('does not fall back to personal when stored org billing is invalid', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_bad_org')
    api.getAutoIngestSettings.mockRejectedValue(new Error('Fathom org billing is not authorized'))

    const event = {
      id: 'meeting_bad_org',
      title: 'Bad org meeting',
      transcript: [{ speaker: { display_name: 'A' }, text: 'hello', timestamp: '1' }],
    }

    await expect(
      webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_bad'),
    ).rejects.toThrow('Fathom org billing is not authorized')
    expect(importJobs.enqueueFathomMeetingImport).not.toHaveBeenCalled()
  })

  it('emits customer_interaction_route envelopes instead of raw fathom events', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_org')
    api.getAutoIngestSettings.mockResolvedValue({
      autoIngest: true,
      billingScope: 'org',
      billingOrgId: 'org_1',
    })
    importJobs.enqueueFathomMeetingImport.mockResolvedValue({
      jobId: 'job-org',
      status: 'queued',
      deduped: false,
    })
    customerBrain.listEnabledCustomerBrainsForRouting.mockResolvedValue([
      { id: 'cb-1', owner_id: 'user_org', org_id: 'org_1', cortex_max: true },
    ])

    const event = {
      id: 'meeting_env',
      title: 'Envelope meeting',
      started_at: '2026-06-10T10:00:00.000Z',
      recorded_by: { email: 'host@example.com', name: 'Host' },
      calendar_invitees: [
        { email: 'host@example.com', name: 'Host' },
        { email: 'client@example.com', name: 'Client One' },
      ],
      transcript: [
        { speaker: { display_name: 'Client One' }, text: 'I want help scaling', timestamp: '1' },
      ],
    }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_env')

    const outboxUpserts = adminMock.upserts.filter((u) => u.table === 'brain_ops_outbox')
    expect(outboxUpserts).toHaveLength(1)
    const rows = outboxUpserts[0].rows as Array<Record<string, any>>
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      brain_id: 'cb-1',
      user_id: 'user_org',
      org_id: 'org_1',
      event_type: 'customer_interaction_route',
      dedupe_key: 'interaction-cb-1-meeting_env-meeting_env',
    })
    expect(rows[0].payload.envelope).toMatchObject({
      v: 1,
      channel: 'fathom',
      source_id: 'meeting_env',
      title: 'Envelope meeting',
    })
    expect(rows[0].payload.envelope.content.text).toContain('I want help scaling')
    expect(rows[0].payload.event).toBeUndefined()
  })

  it('does not enqueue customer routing rows when the event has no transcript', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_org')
    api.getAutoIngestSettings.mockResolvedValue({
      autoIngest: true,
      billingScope: 'org',
      billingOrgId: 'org_1',
    })
    api.getRecordingTranscript.mockResolvedValue({ transcript: [] })
    customerBrain.listEnabledCustomerBrainsForRouting.mockResolvedValue([
      { id: 'cb-1', owner_id: 'user_org', org_id: 'org_1', cortex_max: true },
    ])

    const event = { id: 'meeting_no_transcript', title: 'No transcript' }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_env')

    expect(adminMock.upserts.filter((u) => u.table === 'brain_ops_outbox')).toHaveLength(0)
    expect(importJobs.enqueueFathomMeetingImport).not.toHaveBeenCalled()
    expect(spaceAutomation.processFathomRecordingEvent).toHaveBeenCalledWith(
      expect.anything(),
      'user_org',
      expect.objectContaining({ id: 'meeting_no_transcript' }),
    )
  })

  it('still routes Meetings space automation for shared-team webhooks without transcript', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_dylan')
    api.getAutoIngestSettings.mockResolvedValue({
      autoIngest: true,
      billingScope: 'personal',
      billingOrgId: null,
    })
    api.getRecordingTranscript.mockRejectedValue(new Error('transcript not ready'))

    const event = {
      id: 'rec_team_1',
      recording_id: 'rec_team_1',
      title: 'Teammate hosted standup',
      recorded_by: { email: 'nate@example.com', name: 'Nate' },
    }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_team')

    expect(api.getRecordingTranscript).toHaveBeenCalledWith(
      expect.anything(),
      'user_dylan',
      'rec_team_1',
    )
    expect(importJobs.enqueueFathomMeetingImport).not.toHaveBeenCalled()
    expect(spaceAutomation.processFathomRecordingEvent).toHaveBeenCalledWith(
      expect.anything(),
      'user_dylan',
      expect.objectContaining({ id: 'rec_team_1' }),
    )
  })

  it('hydrates missing transcript from Fathom API before brain import', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_dylan')
    api.getAutoIngestSettings.mockResolvedValue({
      autoIngest: true,
      billingScope: 'personal',
      billingOrgId: null,
    })
    api.getRecordingTranscript.mockResolvedValue({
      transcript: [{ speaker: { display_name: 'Nate' }, text: 'hello team', timestamp: '1' }],
    })
    importJobs.enqueueFathomMeetingImport.mockResolvedValue({
      jobId: 'job-hydrated',
      status: 'queued',
      deduped: false,
    })

    const event = {
      id: 'rec_hydrate_1',
      title: 'Shared team call',
      recorded_by: { email: 'nate@example.com', name: 'Nate' },
    }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_hydrate')

    expect(importJobs.enqueueFathomMeetingImport).toHaveBeenCalledWith(
      'user_dylan',
      expect.objectContaining({
        id: 'rec_hydrate_1',
        transcript: [expect.objectContaining({ text: 'hello team' })],
      }),
      null,
    )
    expect(spaceAutomation.processFathomRecordingEvent).toHaveBeenCalled()
  })

  it('does not resolve webhook payload to the first connected Fathom account', async () => {
    adminMock.rowsByTable.set('user_integrations', [
      { user_id: 'user_first' },
      { user_id: 'user_second' },
    ])
    adminMock.rowsByTable.set('profiles', [
      { id: 'user_first', email: 'first@example.com', fathom_aliases: [] },
      { id: 'user_second', email: 'second@example.com', fathom_aliases: [] },
    ])

    const resolved = await webhookService.resolveUserFromPayload({
      recorded_by: { email: 'unknown@example.com' },
    })

    expect(resolved).toBeNull()
  })

  it('resolves webhook payload only by exact connected profile email or alias', async () => {
    adminMock.rowsByTable.set('user_integrations', [
      { user_id: 'user_first' },
      { user_id: 'user_second' },
    ])
    adminMock.rowsByTable.set('profiles', [
      { id: 'user_first', email: 'first@example.com', fathom_aliases: [] },
      { id: 'user_second', email: 'second@example.com', fathom_aliases: ['host@example.com'] },
    ])

    const resolved = await webhookService.resolveUserFromPayload({
      recorded_by: { email: 'host@example.com' },
    })

    expect(resolved).toBe('user_second')
  })

  it('persists explicit boolean in auto-ingest endpoint', async () => {
    const supabase = {} as any
    const user = { id: 'user_3' }
    oauth.updateAutoIngest.mockResolvedValue({
      autoIngest: false,
      billingScope: 'personal',
      billingOrgId: null,
    })

    const result = await controller.updateAutoIngest(supabase, user, { autoIngest: false })

    expect(oauth.updateAutoIngest).toHaveBeenCalledWith(supabase, 'user_3', false, {
      billingScope: undefined,
      billingOrgId: null,
    })
    expect(result).toEqual({
      success: true,
      autoIngest: false,
      billingScope: 'personal',
      billingOrgId: null,
    })
  })
})
