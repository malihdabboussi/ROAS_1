import { describe, expect, it, vi } from 'vitest'
import { ArtifactChannelContextService } from './artifact-channel-context.service'

const CHANNEL_ID = '11111111-1111-1111-1111-111111111111'
const CAMPAIGN_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CAMPAIGN_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function makeSupabase(tables: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => {
      const result = tables[table] ?? null
      const resolved = { data: result, error: null }
      const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        maybeSingle: vi.fn(async () => resolved),
        then(
          onFulfilled: (value: typeof resolved) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          return Promise.resolve(resolved).then(onFulfilled, onRejected)
        },
      }
      return query
    }),
  }
}

function makeTarget(overrides: {
  tables: Record<string, unknown>
  campaigns: unknown
  mainApiCall?: ReturnType<typeof vi.fn>
}) {
  const mainApiCall =
    overrides.mainApiCall ??
    vi.fn(async (method: string) => (method === 'GET' ? overrides.campaigns : { channel: {} }))
  return {
    target: {
      resolveUserId: vi.fn(() => 'user-1'),
      svc: { client: makeSupabase(overrides.tables) },
      mainApiCall,
    },
    mainApiCall,
  }
}

const baseChannel = {
  id: CHANNEL_ID,
  org_id: 'org-1',
  user_id: 'user-1',
  metadata: {},
}

describe('ArtifactChannelContextService', () => {
  const service = new ArtifactChannelContextService()

  it('returns a confirm ui block when several campaigns are plausible', async () => {
    const { target } = makeTarget({
      tables: {
        channels: baseChannel,
        avatars: [{ campaign_id: CAMPAIGN_A }, { campaign_id: CAMPAIGN_A }],
        offers: [{ campaign_id: CAMPAIGN_B }],
      },
      campaigns: {
        campaigns: [
          { id: CAMPAIGN_A, name: 'Viralish U', org_id: 'org-1', status: 'active', config: {} },
          { id: CAMPAIGN_B, name: 'Brand X', org_id: 'org-1', status: 'active', config: {} },
        ],
      },
    })

    const handlers = service.getHandlers(target as any)
    const result = (await handlers.discover_channel_context!(
      { channel_id: CHANNEL_ID },
      'session-key',
    )) as Record<string, any>

    expect(result.success).toBe(true)
    expect(result.single_candidate).toBeUndefined()
    expect(result.campaigns).toHaveLength(2)
    expect(result.suggested_campaign_id).toBe(CAMPAIGN_A)
    expect(result.ui_blocks).toHaveLength(1)
    expect(result.ui_blocks[0]).toMatchObject({
      type: 'campaign_context_confirm',
      status: 'pending',
      channel_id: CHANNEL_ID,
      suggested_campaign_id: CAMPAIGN_A,
    })
  })

  it('flags a single plausible campaign without emitting a ui block', async () => {
    const { target } = makeTarget({
      tables: {
        channels: baseChannel,
        avatars: [{ campaign_id: CAMPAIGN_A }],
        offers: [],
      },
      campaigns: {
        campaigns: [
          { id: CAMPAIGN_A, name: 'Viralish U', org_id: 'org-1', status: 'active', config: {} },
          { id: CAMPAIGN_B, name: 'Empty One', org_id: 'org-1', status: 'active', config: {} },
        ],
      },
    })

    const handlers = service.getHandlers(target as any)
    const result = (await handlers.discover_channel_context!(
      { channel_id: CHANNEL_ID },
      'session-key',
    )) as Record<string, any>

    expect(result.success).toBe(true)
    expect(result.single_candidate).toBe(true)
    expect(result.suggested_campaign_id).toBe(CAMPAIGN_A)
    expect(result.ui_blocks).toBeUndefined()
  })

  it('excludes general system campaigns and campaigns from other orgs', async () => {
    const { target } = makeTarget({
      tables: { channels: baseChannel, avatars: [], offers: [] },
      campaigns: {
        campaigns: [
          {
            id: CAMPAIGN_A,
            name: 'General',
            org_id: 'org-1',
            status: 'active',
            config: { system_kind: 'general' },
          },
          { id: CAMPAIGN_B, name: 'Other Org', org_id: 'org-2', status: 'active', config: {} },
        ],
      },
    })

    const handlers = service.getHandlers(target as any)
    const result = (await handlers.discover_channel_context!(
      { channel_id: CHANNEL_ID },
      'session-key',
    )) as Record<string, any>

    expect(result.success).toBe(true)
    expect(result.campaigns).toHaveLength(0)
    expect(result.guidance).toContain('No campaigns available')
  })

  it('set_channel_context delegates to the main API PATCH', async () => {
    const { target, mainApiCall } = makeTarget({
      tables: { channels: baseChannel },
      campaigns: [],
    })

    const handlers = service.getHandlers(target as any)
    const result = (await handlers.set_channel_context!(
      { channel_id: CHANNEL_ID, campaign_id: CAMPAIGN_A },
      'session-key',
    )) as Record<string, any>

    expect(mainApiCall).toHaveBeenCalledWith(
      'PATCH',
      `/api/channels/${CHANNEL_ID}`,
      'session-key',
      {
        default_campaign_id: CAMPAIGN_A,
      },
    )
    expect(result.success).toBe(true)
    expect(result.default_campaign_id).toBe(CAMPAIGN_A)
  })

  it('set_channel_context clears the binding when campaign_id is omitted', async () => {
    const { target, mainApiCall } = makeTarget({
      tables: { channels: baseChannel },
      campaigns: [],
    })

    const handlers = service.getHandlers(target as any)
    const result = (await handlers.set_channel_context!(
      { channel_id: CHANNEL_ID },
      'session-key',
    )) as Record<string, any>

    expect(mainApiCall).toHaveBeenCalledWith(
      'PATCH',
      `/api/channels/${CHANNEL_ID}`,
      'session-key',
      {
        default_campaign_id: null,
      },
    )
    expect(result.default_campaign_id).toBeNull()
  })

  it('rejects discovery when the user has no relation to the channel', async () => {
    const { target } = makeTarget({
      tables: {
        channels: { ...baseChannel, user_id: 'someone-else', org_id: null },
        channel_memberships: null,
      },
      campaigns: [],
    })

    const handlers = service.getHandlers(target as any)
    const result = (await handlers.discover_channel_context!(
      { channel_id: CHANNEL_ID },
      'session-key',
    )) as Record<string, any>

    expect(result.success).toBe(false)
    expect(result.error).toBe('Channel not found')
  })
})
