import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { MetaAdsInsightsRow } from '../../services/analytics.service'
import { AdAnalysisPanel } from './AdAnalysisPanel'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const rows: MetaAdsInsightsRow[] = [
  {
    id: 'campaign-1',
    name: 'Webinar Campaign',
    level: 'campaign',
    meta_id: 'meta-1',
    meta_effective_status: 'ACTIVE',
    ad_account_id: 'act-1',
    spend: 100,
    impressions: 1000,
    reach: 800,
    clicks: 50,
    ctr: 5,
    cpc: 2,
    cpm: 100,
    leads: 10,
    conversions: 0,
    results: 10,
    result_type: 'registration',
    revenue: 0,
    roas: 0,
    cost_per_result: 10,
    daily_budget: 600,
    lifetime_budget: null,
  },
  {
    id: 'campaign-2',
    name: 'Sales Campaign',
    level: 'campaign',
    meta_id: 'meta-2',
    meta_effective_status: 'ACTIVE',
    ad_account_id: 'act-1',
    spend: 50,
    impressions: 500,
    reach: 400,
    clicks: 20,
    ctr: 4,
    cpc: 2.5,
    cpm: 100,
    leads: 0,
    conversions: 2,
    results: 2,
    result_type: 'purchase',
    revenue: 200,
    roas: 4,
    cost_per_result: 25,
    daily_budget: 300,
    lifetime_budget: null,
  },
]

describe('AdAnalysisPanel', () => {
  beforeEach(() => {
    useGlobalChatStore.setState({ pendingSeed: null, activeAgentKey: 'vibey' })
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: 'old-chat', width: 420, minimized: false },
    })
  })

  afterEach(cleanup)

  it('opens a fresh Blaze chat with only selected campaigns', () => {
    render(
      <AdAnalysisPanel
        campaignId="workspace-campaign"
        campaignName="Sakha Media Group"
        campaignRows={rows}
        timeRangeLabel="Last 30 days"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Sales Campaign/ }))
    fireEvent.click(screen.getByRole('button', { name: /What Needs Improvement/ }))

    const seed = useGlobalChatStore.getState().pendingSeed
    expect(seed).toMatchObject({
      agentKey: 'ads_manager',
      railIntent: 'new',
      workContext: { surface: 'spaces', campaignId: 'workspace-campaign' },
    })
    expect(seed?.content).toContain('Webinar Campaign')
    expect(seed?.content).not.toContain('Sales Campaign')
    expect(useShellStore.getState().chatDrawer).toMatchObject({
      open: true,
      conversationId: null,
    })
  })
})
