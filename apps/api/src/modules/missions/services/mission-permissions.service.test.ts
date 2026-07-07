import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { MissionPermissionsService } from './mission-permissions.service'

function createSupabase(opts: {
  shares?: unknown[]
  campaign?: Record<string, unknown> | null
  shareError?: unknown
  campaignError?: unknown
}) {
  const shareTerminal = {
    eq: vi.fn().mockResolvedValue({ data: opts.shares ?? [], error: opts.shareError ?? null }),
  }
  const shareQuery = {
    select: vi.fn(() => shareTerminal),
  }

  const campaignTerminal = {
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: opts.campaign ?? null, error: opts.campaignError ?? null }),
  }
  const campaignFilter = {
    eq: vi.fn(() => campaignTerminal),
  }
  const campaignQuery = {
    select: vi.fn(() => campaignFilter),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'mission_shares') return shareQuery
      if (table === 'campaigns') return campaignQuery
      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return {
    supabase: supabase as unknown as SupabaseClient,
    from: supabase.from,
    shareTerminal,
    campaignFilter,
    campaignTerminal,
  }
}

describe('MissionPermissionsService', () => {
  it('uses the strongest explicit user or org mission share level', async () => {
    const { supabase, shareTerminal } = createSupabase({
      shares: [
        { entity_type: 'user', entity_id: 'user-1', org_id: null, level: 'comment' },
        { entity_type: 'org', entity_id: 'org-1', org_id: 'org-1', level: 'edit' },
        { entity_type: 'user', entity_id: 'someone-else', org_id: null, level: 'admin' },
      ],
    })
    const service = new MissionPermissionsService({ resolveEffectiveLevel: vi.fn() } as any)

    await expect(
      service.resolveMissionLevel(
        supabase,
        'user-1',
        null,
        { id: 'mission-1', user_id: 'owner-1', mission_visibility: 'shared' },
        'org-1',
      ),
    ).resolves.toBe('edit')

    expect(shareTerminal.eq).toHaveBeenCalledWith('mission_id', 'mission-1')
  })

  it('grants view access for campaign-visible missions when the campaign exists', async () => {
    const { supabase, campaignFilter, campaignTerminal } = createSupabase({
      shares: [],
      campaign: { id: 'campaign-1' },
    })
    const service = new MissionPermissionsService({ resolveEffectiveLevel: vi.fn() } as any)

    await expect(
      service.resolveMissionLevel(
        supabase,
        'user-1',
        null,
        {
          id: 'mission-1',
          user_id: 'owner-1',
          mission_visibility: 'campaign',
          campaign_id: 'campaign-1',
        },
        null,
      ),
    ).resolves.toBe('view')

    expect(campaignFilter.eq).toHaveBeenCalledWith('id', 'campaign-1')
    expect(campaignTerminal.maybeSingle).toHaveBeenCalled()
  })

  it('redacts sensitive mission fields below edit access', () => {
    const service = new MissionPermissionsService({ resolveEffectiveLevel: vi.fn() } as any)

    expect(
      service.redactMission(
        {
          id: 'mission-1',
          title: 'Keep',
          brief: 'hide',
          description: 'hide',
          progress_notes: 'hide',
        },
        'view',
      ),
    ).toEqual({
      id: 'mission-1',
      title: 'Keep',
      brief: null,
      description: null,
      progress_notes: null,
    })
  })
})
