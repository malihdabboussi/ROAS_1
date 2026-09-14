import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderContext } from '../../../../meetings/providers/transcript-provider.contract'
import { FathomTranscriptProvider } from '../fathom-transcript-provider'

describe('FathomTranscriptProvider', () => {
  let registry: { register: ReturnType<typeof vi.fn> }
  let api: {
    getRecordingTranscript: ReturnType<typeof vi.fn>
    listMeetings: ReturnType<typeof vi.fn>
  }
  let repository: Record<string, ReturnType<typeof vi.fn>>
  let campaignBrainRoute: { routeAfterPageGraderSync: ReturnType<typeof vi.fn> }
  let pageGrader: { syncFathomMeeting: ReturnType<typeof vi.fn> }
  let provider: FathomTranscriptProvider
  let ctx: ProviderContext

  beforeEach(() => {
    registry = { register: vi.fn() }
    api = {
      getRecordingTranscript: vi.fn().mockResolvedValue({ transcript: [] }),
      listMeetings: vi.fn().mockResolvedValue({ items: [] }),
    }
    repository = {
      getProfilePreferences: vi.fn().mockResolvedValue({}),
      getFathomAliases: vi.fn().mockResolvedValue([]),
      getProfileIdentity: vi.fn().mockResolvedValue(null),
      updateFathomAliases: vi.fn().mockResolvedValue(null),
    }
    campaignBrainRoute = { routeAfterPageGraderSync: vi.fn().mockResolvedValue([]) }
    pageGrader = {
      syncFathomMeeting: vi.fn().mockResolvedValue({
        matched_clients: [{ id: 'client_1', name: 'Acme', matched_by: 'email' }],
      }),
    }
    provider = new FathomTranscriptProvider(
      registry as never,
      api as never,
      repository as never,
      campaignBrainRoute as never,
      pageGrader as never,
    )
    ctx = {
      supabase: {} as never,
      userId: 'user_1',
      orgId: null,
      connection: {
        id: 'conn_1',
        userId: 'user_1',
        orgId: null,
        provider: 'fathom',
        status: 'connected',
        metadata: { webhook_secret: 'whsec_abc' },
      },
    }
  })

  it('registers itself with the shared registry on module init', () => {
    provider.onModuleInit()
    expect(registry.register).toHaveBeenCalledWith(provider)
    expect(provider.identity).toEqual(expect.objectContaining({ id: 'fathom', auth: 'oauth2' }))
  })

  it('parses a delivery into the recording id, delivery id and inline event', () => {
    const body = Buffer.from(JSON.stringify({ recording_id: 42, title: 'Call' }))
    expect(provider.push.parse(body, { 'webhook-id': 'msg_9' })).toEqual({
      externalId: '42',
      deliveryId: 'msg_9',
      eventType: 'recording_ready',
      inlineEvent: { recording_id: 42, title: 'Call' },
    })
  })

  it('refuses bodies that are not JSON objects or have no recording id', () => {
    expect(provider.push.parse(Buffer.from('not json'), {})).toBeNull()
    expect(provider.push.parse(Buffer.from('[1]'), {})).toBeNull()
    expect(provider.push.parse(Buffer.from(JSON.stringify({ title: 'x' })), {})).toBeNull()
  })

  it('reads the webhook secret from the connection metadata', async () => {
    await expect(provider.push.resolveSecret(ctx)).resolves.toBe('whsec_abc')
    ctx.connection.metadata = {}
    await expect(provider.push.resolveSecret(ctx)).resolves.toBeNull()
  })

  it('hydrates a missing transcript and action items from the Fathom API before normalizing', async () => {
    api.getRecordingTranscript.mockResolvedValue({
      transcript: [{ speaker: { display_name: 'Host' }, text: 'hello team', timestamp: '1' }],
    })
    api.listMeetings.mockResolvedValue({
      items: [{ recording_id: 'rec_1', action_items: [{ description: 'Send deck' }] }],
    })

    const source = await provider.pull.fetch(ctx, 'rec_1', { recording_id: 'rec_1', title: 'Sync' })

    expect(api.getRecordingTranscript).toHaveBeenCalledWith(ctx.supabase, 'user_1', 'rec_1')
    expect(source.provider).toBe('fathom')
    expect(source.kind).toBe('meeting')
    expect(source.externalRecordingId).toBe('rec_1')
    expect(source.transcript).toEqual([
      { speakerName: 'Host', speakerEmail: null, timestamp: '1', text: 'hello team' },
    ])
    expect(source.actions.map((a) => a.sourceText)).toEqual(['Send deck'])
  })

  it('keeps an inline transcript and does not call the API for it', async () => {
    const source = await provider.pull.fetch(ctx, 'rec_2', {
      recording_id: 'rec_2',
      title: 'Sync',
      transcript: [{ speaker: { display_name: 'A' }, text: 'hi', timestamp: '1' }],
      action_items: [{ description: 'x' }],
    })
    expect(api.getRecordingTranscript).not.toHaveBeenCalled()
    expect(api.listMeetings).not.toHaveBeenCalled()
    expect(source.transcript).toHaveLength(1)
  })

  it('skips a meeting whose agenda occurrence the user minimized', async () => {
    repository.getProfilePreferences.mockResolvedValue({
      agenda_minimized_occurrences: [
        {
          key: 'account-1:event-1:2026-07-30T17:00:00.000Z',
          eventId: 'event-1',
          title: 'Weekly Campaign Review',
          start: '2026-07-30T17:00:00.000Z',
          source: 'google_calendar',
          accountId: 'account-1',
        },
      ],
    })
    const source = provider.normalize({
      recording_id: 'rec_3',
      title: 'Weekly Campaign Review',
      scheduled_start_time: '2026-07-30T17:00:00.000Z',
    })
    await expect(provider.hooks.beforeIntake(ctx, { source })).resolves.toEqual({
      proceed: false,
      reason: 'agenda_occurrence_minimized',
    })
  })

  it('lets a normal meeting through and learns the owner alias when it looks like the owner', async () => {
    repository.getProfileIdentity.mockResolvedValue({
      email: 'dylan@example.com',
      full_name: 'Dylan Vanas',
    })
    const source = provider.normalize({
      recording_id: 'rec_4',
      title: 'Client sync',
      recorded_by: { email: 'dylan.v@fathom-alias.com', name: 'Dylan' },
    })
    await expect(provider.hooks.beforeIntake(ctx, { source })).resolves.toEqual({ proceed: true })
    expect(repository.updateFathomAliases).toHaveBeenCalledWith('user_1', [
      'dylan.v@fathom-alias.com',
    ])
  })

  it('routes matched Page Grader clients into campaign brains only when a transcript exists', async () => {
    const source = provider.normalize({ recording_id: 'rec_5', title: 'Call' })
    await provider.hooks.afterSpaceRoute(ctx, {
      source,
      spaceRoute: { space_id: 'space_1', item_id: 'item_1' },
      hasTranscript: true,
    })
    expect(pageGrader.syncFathomMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        routes: [{ space_id: 'space_1', item_id: 'item_1' }],
      }),
    )
    expect(campaignBrainRoute.routeAfterPageGraderSync).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        matchedClients: [{ id: 'client_1', name: 'Acme', matched_by: 'email' }],
      }),
    )

    campaignBrainRoute.routeAfterPageGraderSync.mockClear()
    await provider.hooks.afterSpaceRoute(ctx, { source, spaceRoute: null, hasTranscript: false })
    expect(campaignBrainRoute.routeAfterPageGraderSync).not.toHaveBeenCalled()
  })

  it('lists recent meetings through the API with a cursor', async () => {
    api.listMeetings.mockResolvedValue({
      items: [{ recording_id: 'rec_1', title: 'Call', url: 'https://fathom.video/r/1' }],
      next_cursor: 'c2',
    })
    const page = await provider.pull.listRecent(ctx, 'c1')
    expect(api.listMeetings).toHaveBeenCalledWith(ctx.supabase, 'user_1', 'c1')
    expect(page).toEqual({
      items: [
        expect.objectContaining({
          externalId: 'rec_1',
          title: 'Call',
          url: 'https://fathom.video/r/1',
        }),
      ],
      nextCursor: 'c2',
    })
  })
})
