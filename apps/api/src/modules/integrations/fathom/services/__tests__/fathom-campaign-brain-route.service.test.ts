import { describe, expect, it, vi } from 'vitest'
import {
  FathomCampaignBrainRouteService,
  isSystemCampaign,
} from '../fathom-campaign-brain-route.service'

function supabaseWith(rows: {
  space?: { campaign_id: string | null } | null
  campaign?: { id: string; name: string | null; config: unknown } | null
  spaceError?: string
}) {
  const table = (name: string) => {
    const result =
      name === 'spaces'
        ? { data: rows.space ?? null, error: rows.spaceError ? { message: rows.spaceError } : null }
        : { data: rows.campaign ?? null, error: null }
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.maybeSingle = vi.fn(async () => result)
    return chain
  }
  return { from: vi.fn(table) } as never
}

const event = { id: 'rec-1', title: '1DS x ROAS Weekly Session', transcript: [] }

describe('FathomCampaignBrainRouteService', () => {
  it('queues the meeting into the client campaign brain when the Space route resolves a client campaign', async () => {
    const importJobs = { enqueueCampaignFathomImport: vi.fn(async () => ({ jobId: 'job-9', status: 'queued' })) }
    const service = new FathomCampaignBrainRouteService(importJobs as never)

    const decision = await service.enqueueForRoute({
      supabase: supabaseWith({
        space: { campaign_id: 'camp-1ds' },
        campaign: { id: 'camp-1ds', name: '1DS Collective LLC', config: {} },
      }),
      userId: 'user-1',
      orgId: 'org-1',
      event,
      spaceRoute: { space_id: 'space-1ds', item_id: 'item-1' },
    })

    expect(decision).toEqual({ routed: true, campaignId: 'camp-1ds', jobId: 'job-9' })
    expect(importJobs.enqueueCampaignFathomImport).toHaveBeenCalledWith(
      'user-1',
      { campaignId: 'camp-1ds', meeting: event },
      'org-1',
    )
  })

  it('does not write client meetings into General or Personal system campaigns', async () => {
    const importJobs = { enqueueCampaignFathomImport: vi.fn() }
    const service = new FathomCampaignBrainRouteService(importJobs as never)

    const decision = await service.enqueueForRoute({
      supabase: supabaseWith({
        space: { campaign_id: 'camp-general' },
        campaign: { id: 'camp-general', name: 'General', config: { system_kind: 'general' } },
      }),
      userId: 'user-1',
      orgId: 'org-1',
      event,
      spaceRoute: { space_id: 'space-general', item_id: 'item-1' },
    })

    expect(decision).toEqual({ routed: false, reason: 'system_campaign' })
    expect(importJobs.enqueueCampaignFathomImport).not.toHaveBeenCalled()
  })

  it('skips quietly when there is no Space route or the Space has no campaign', async () => {
    const importJobs = { enqueueCampaignFathomImport: vi.fn() }
    const service = new FathomCampaignBrainRouteService(importJobs as never)

    await expect(
      service.enqueueForRoute({
        supabase: supabaseWith({}),
        userId: 'user-1',
        orgId: null,
        event,
        spaceRoute: null,
      }),
    ).resolves.toEqual({ routed: false, reason: 'no_space' })

    await expect(
      service.enqueueForRoute({
        supabase: supabaseWith({ space: { campaign_id: null } }),
        userId: 'user-1',
        orgId: null,
        event,
        spaceRoute: { space_id: 'space-x' },
      }),
    ).resolves.toEqual({ routed: false, reason: 'no_campaign' })
    expect(importJobs.enqueueCampaignFathomImport).not.toHaveBeenCalled()
  })

  it('never throws out of the webhook when the lookup fails', async () => {
    const importJobs = { enqueueCampaignFathomImport: vi.fn() }
    const service = new FathomCampaignBrainRouteService(importJobs as never)

    await expect(
      service.enqueueForRoute({
        supabase: supabaseWith({ spaceError: 'boom' }),
        userId: 'user-1',
        orgId: null,
        event,
        spaceRoute: { space_id: 'space-x' },
      }),
    ).resolves.toEqual({ routed: false, reason: 'lookup_failed' })
  })
})

describe('isSystemCampaign', () => {
  it('matches the same General/Personal markers as campaign services', () => {
    expect(isSystemCampaign({ name: 'General', config: null })).toBe(true)
    expect(isSystemCampaign({ name: 'Anything', config: { system_kind: 'general' } })).toBe(true)
    expect(isSystemCampaign({ name: 'Anything', config: { system_kind: 'personal' } })).toBe(true)
    expect(isSystemCampaign({ name: 'Anything', config: { is_general: true } })).toBe(true)
    expect(isSystemCampaign({ name: 'Yasir Khan Coaching LTD', config: {} })).toBe(false)
  })
})
