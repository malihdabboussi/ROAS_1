import { describe, expect, it, vi } from 'vitest'
import { bindChannelConversationCampaign } from './channel-chat-campaign-bind'

function makeQuery(result: unknown, onUpdate?: (values: unknown) => void) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    update: vi.fn((values: unknown) => {
      onUpdate?.(values)
      return query
    }),
    maybeSingle: vi.fn(async () => ({ data: result, error: null })),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: result, error: null })),
  }
  return query
}

const YASIR = 'bad92814-a1cb-4b66-ba92-66dd02dc42e1'

function supabaseWith(rows: { campaigns?: unknown; conversations?: unknown }) {
  const updates: unknown[] = []
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') return makeQuery(rows.campaigns ?? null)
      if (table === 'conversations')
        return makeQuery(rows.conversations ?? null, (v) => updates.push(v))
      return makeQuery(null)
    }),
  }
  return { supabase, updates }
}

describe('bindChannelConversationCampaign', () => {
  const input = { conversationId: 'conv-1', userId: 'user-1', orgId: 'org-1', campaignId: YASIR }

  it('binds the Slack conversation to the resolved client campaign before the turn', async () => {
    const { supabase, updates } = supabaseWith({
      campaigns: { id: YASIR, name: 'Yasir Khan Coaching LTD', config: {}, org_id: 'org-1' },
      conversations: { campaign_id: 'general-id' },
    })
    await expect(bindChannelConversationCampaign(supabase as never, input)).resolves.toEqual({
      status: 'bound',
      campaignId: YASIR,
    })
    expect(updates).toEqual([{ campaign_id: YASIR }])
  })

  it('is a no-op when already bound and rejects General / wrong org / unknown', async () => {
    const same = supabaseWith({
      campaigns: { id: YASIR, name: 'Yasir', config: {}, org_id: 'org-1' },
      conversations: { campaign_id: YASIR },
    })
    await expect(bindChannelConversationCampaign(same.supabase as never, input)).resolves.toEqual({
      status: 'unchanged',
      campaignId: YASIR,
    })
    expect(same.updates).toEqual([])

    const general = supabaseWith({
      campaigns: {
        id: YASIR,
        name: 'General',
        config: { system_kind: 'general' },
        org_id: 'org-1',
      },
    })
    await expect(
      bindChannelConversationCampaign(general.supabase as never, input),
    ).resolves.toEqual({
      status: 'rejected',
      reason: 'general_campaign',
    })
    const wrongOrg = supabaseWith({
      campaigns: { id: YASIR, name: 'Yasir', config: {}, org_id: 'org-2' },
    })
    await expect(
      bindChannelConversationCampaign(wrongOrg.supabase as never, input),
    ).resolves.toEqual({
      status: 'rejected',
      reason: 'wrong_org',
    })
    const unknown = supabaseWith({})
    await expect(
      bindChannelConversationCampaign(unknown.supabase as never, input),
    ).resolves.toEqual({
      status: 'rejected',
      reason: 'campaign_not_found',
    })
  })
})
