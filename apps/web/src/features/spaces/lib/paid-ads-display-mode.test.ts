import { describe, expect, it } from 'vitest'
import type { ViewDef } from '../types/space-schema'
import {
  consolidatePaidAdsViews,
  resolveConsolidatedPaidAdsView,
  resolvePaidAdsWorkspaceMode,
} from './paid-ads-display-mode'

const views = [
  { id: 'paid', name: 'Paid Ads', type: 'ads' },
  { id: 'research', name: 'Ads Research', type: 'ads_research' },
] as ViewDef[]

describe('paid ads display mode', () => {
  it('keeps one paid ads tab when the legacy research tab is present', () => {
    expect(consolidatePaidAdsViews(views).map((view) => view.id)).toEqual(['paid'])
  })

  it('routes an old Ads Research selection into the unified Research mode', () => {
    const resolved = resolveConsolidatedPaidAdsView(views, 'research')
    expect(resolved?.id).toBe('paid')
    expect(resolvePaidAdsWorkspaceMode(resolved ?? null)).toBe('research')
  })
})
