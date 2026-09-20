import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FathomWebhookService } from '../../services/fathom-webhook.service'
import { FathomController } from '../fathom.controller'

const adminMock = vi.hoisted(() => {
  const rowsByTable = new Map<string, unknown[]>()
  const makeChain = (table: string) => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      limit: () => chain,
      update: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: rowsByTable.get(table) ?? [], error: null }).then(resolve),
    }
    return chain
  }
  return { rowsByTable, makeChain }
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
  let intake: { intakeForUser: ReturnType<typeof vi.fn> }
  let fathomRepository: any
  let controller: FathomController
  let webhookService: FathomWebhookService

  beforeEach(() => {
    oauth = {
      getStatus: vi.fn(),
      updateAutoIngest: vi.fn(),
      updateAgendaExclusion: vi.fn(),
      listAgendaExclusions: vi.fn(),
      ensureMeetingsSpace: vi.fn(),
      getAuthorizationUrl: vi.fn(),
      handleCallback: vi.fn(),
      disconnect: vi.fn(),
    }

    api = {
      resolveUserByWebhookSecret: vi.fn().mockResolvedValue(null),
    }

    intake = {
      intakeForUser: vi.fn().mockResolvedValue({
        status: 'processed',
        hasTranscript: true,
        brainJobId: 'job-1',
        spaceRoute: null,
      }),
    }

    fathomRepository = {
      listConnectedIntegrationUserIds: vi.fn(async () => ({
        data: (adminMock.rowsByTable.get('user_integrations') ?? []) as Array<{ user_id: string }>,
        error: null,
      })),
      listConnectedWebhookRows: vi.fn(async () =>
        (
          (adminMock.rowsByTable.get('user_integrations') ?? []) as Array<{
            user_id: string
            metadata?: unknown
          }>
        ).map((row) => ({
          user_id: row.user_id,
          metadata: row.metadata ?? {},
        })),
      ),
      listProfilesForUserIds: vi.fn(async (userIds: string[]) =>
        (adminMock.rowsByTable.get('profiles') ?? []).filter((profile: any) =>
          userIds.includes(profile.id),
        ),
      ),
    }

    controller = new FathomController(oauth)
    webhookService = new FathomWebhookService(api, fathomRepository, intake as never)
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

  it('hands a legacy-door delivery to the shared meeting intake for the resolved user', async () => {
    api.resolveUserByWebhookSecret.mockResolvedValue('user_2')
    const event = {
      id: 'meeting_2',
      title: 'Strategy call',
      transcript: [{ speaker: { display_name: 'Founder' }, text: 'Important decision' }],
    }

    await webhookService.processWebhookAsync(JSON.stringify(event), 'whsec_2')

    expect(api.resolveUserByWebhookSecret).toHaveBeenCalledWith('whsec_2')
    expect(intake.intakeForUser).toHaveBeenCalledWith({
      provider: 'fathom',
      userId: 'user_2',
      externalId: 'meeting_2',
      inlineEvent: expect.objectContaining({ id: 'meeting_2', title: 'Strategy call' }),
    })
  })

  it('drops a legacy-door delivery when no user can be resolved', async () => {
    await webhookService.processWebhookAsync(JSON.stringify({ id: 'meeting_x' }), '')
    expect(intake.intakeForUser).not.toHaveBeenCalled()
  })

  it('drops a legacy-door delivery that is not JSON', async () => {
    await webhookService.processWebhookAsync('not json', 'whsec_1')
    expect(api.resolveUserByWebhookSecret).not.toHaveBeenCalled()
    expect(intake.intakeForUser).not.toHaveBeenCalled()
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

  it('resolves teammate-recorded shared calls via calendar invitee email', async () => {
    adminMock.rowsByTable.set('user_integrations', [{ user_id: 'user_dylan' }])
    adminMock.rowsByTable.set('profiles', [
      { id: 'user_dylan', email: 'dylan@dylanvanas.com', fathom_aliases: [] },
    ])

    const resolved = await webhookService.resolveUserFromPayload({
      recorded_by: { email: 'nate@roas.co' },
      calendar_invitees: [{ email: 'nate@roas.co' }, { email: 'dylan@dylanvanas.com' }],
    })

    expect(resolved).toBe('user_dylan')
  })

  it('attributes unsigned shared-team webhooks to the sole shared_team subscriber', async () => {
    adminMock.rowsByTable.set('user_integrations', [
      {
        user_id: 'user_dylan',
        metadata: {
          triggered_for: ['my_recordings', 'shared_team_recordings'],
        },
      },
    ])
    adminMock.rowsByTable.set('profiles', [
      { id: 'user_dylan', email: 'dylan@dylanvanas.com', fathom_aliases: [] },
    ])

    const resolved = await webhookService.resolveUserFromPayload({
      recorded_by: { email: 'nefi@roas.co' },
      calendar_invitees: [{ email: 'nefi@roas.co' }, { email: 'client@example.com' }],
    })

    expect(resolved).toBe('user_dylan')
  })

  it('does not attribute unsigned shared-team webhooks when multiple subscribers exist', async () => {
    adminMock.rowsByTable.set('user_integrations', [
      {
        user_id: 'user_dylan',
        metadata: { triggered_for: ['shared_team_recordings'] },
      },
      {
        user_id: 'user_nate',
        metadata: { triggered_for: ['shared_team_recordings'] },
      },
    ])
    adminMock.rowsByTable.set('profiles', [
      { id: 'user_dylan', email: 'dylan@dylanvanas.com', fathom_aliases: [] },
      { id: 'user_nate', email: 'nate@roas.co', fathom_aliases: [] },
    ])

    const resolved = await webhookService.resolveUserFromPayload({
      recorded_by: { email: 'nefi@roas.co' },
      calendar_invitees: [{ email: 'nefi@roas.co' }],
    })

    expect(resolved).toBeNull()
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

  it('persists one Agenda occurrence exclusion through the Fathom settings service', async () => {
    const supabase = {} as any
    const body = {
      minimized: true,
      event: {
        key: 'account-1:event-1:2026-07-30T17:00:00.000Z',
        eventId: 'event-1',
        title: 'Weekly Campaign Review',
        start: '2026-07-30T17:00:00.000Z',
        source: 'google_calendar' as const,
        accountId: 'account-1',
      },
    }

    await expect(
      controller.updateAgendaExclusion(supabase, { id: 'user_1' }, body),
    ).resolves.toEqual({ success: true })
    expect(oauth.updateAgendaExclusion).toHaveBeenCalledWith(supabase, 'user_1', body)
  })

  it('loads persisted Agenda exclusions for UI reconciliation', async () => {
    const supabase = {} as any
    oauth.listAgendaExclusions.mockResolvedValue([{ key: 'occurrence-1' }])

    await expect(controller.listAgendaExclusions(supabase, { id: 'user_1' })).resolves.toEqual({
      success: true,
      exclusions: [{ key: 'occurrence-1' }],
    })
    expect(oauth.listAgendaExclusions).toHaveBeenCalledWith(supabase, 'user_1')
  })
})
