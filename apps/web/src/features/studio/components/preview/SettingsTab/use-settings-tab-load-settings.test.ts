import { renderHook, waitFor } from '@testing-library/react'
import { useCallback, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { billingApi } from '@/lib/billing/billing-api'
import {
  fetchCampaignAdCampaigns,
  fetchCampaignFunnels,
  fetchCampaignPresentations,
  type Funnel,
} from '../../../services/artifact-preview.service'
import { fetchCampaign } from '../../../services/campaign.service'
import type { AdCampaign, Presentation } from '../../../types'
import { useSettingsTabLoadSettings } from './use-settings-tab-load-settings'

type MetaAccountOption = {
  id: string
  name: string
}

vi.mock('@/lib/billing/billing-api', () => ({
  billingApi: {
    getStatus: vi.fn().mockResolvedValue({ plan: { slug: 'pro' } }),
  },
}))

vi.mock('../../../services/campaign.service', () => ({
  fetchCampaign: vi.fn().mockResolvedValue({
    config: {
      agent_settings: {
        media_generation_enabled: false,
        model_strategy: 'speed',
      },
    },
  }),
}))

vi.mock('../../../services/artifact-preview.service', () => ({
  fetchCampaignAdCampaigns: vi.fn().mockResolvedValue([{ id: 'ad-campaign-1' }]),
  fetchCampaignFunnels: vi.fn().mockResolvedValue([{ id: 'funnel-1' }]),
  fetchCampaignPresentations: vi.fn().mockResolvedValue([{ id: 'presentation-1' }]),
  getMetaConnectionStatus: vi.fn().mockResolvedValue({
    connected: true,
    adAccounts: [{ id: 'account-1', name: 'Account One' }],
    pages: [{ id: 'page-1', name: 'Page One' }],
  }),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function useHarness(campaignId = 'campaign-1') {
  const [campaignConfig, setCampaignConfig] = useState<Record<string, unknown>>({})
  const [mediaGenerationEnabled, setMediaGenerationEnabled] = useState(true)
  const [campaignModelStrategy, setCampaignModelStrategy] = useState('auto')
  const [isFreeUser, setIsFreeUser] = useState(true)
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([])
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null)
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAccountOption[]>([])
  const [metaPages, setMetaPages] = useState<MetaAccountOption[]>([])
  const normalizeModelStrategy = useCallback(
    (value: string | undefined) => (value === 'speed' ? value : 'auto'),
    [],
  )
  const controls = useSettingsTabLoadSettings({
    campaignId,
    setCampaignConfig,
    setMediaGenerationEnabled,
    setCampaignModelStrategy,
    setIsFreeUser,
    setFunnels,
    setPresentations,
    setAdCampaigns,
    setMetaConnected,
    setMetaAdAccounts,
    setMetaPages,
    normalizeModelStrategy,
  })

  return {
    campaignConfig,
    mediaGenerationEnabled,
    campaignModelStrategy,
    isFreeUser,
    funnels,
    presentations,
    adCampaigns,
    metaConnected,
    metaAdAccounts,
    metaPages,
    ...controls,
  }
}

describe('useSettingsTabLoadSettings', () => {
  it('hydrates campaign settings and related assets from the existing load path', async () => {
    const { result } = renderHook(() => useHarness())

    await waitFor(() => {
      expect(result.current.settingsLoading).toBe(false)
    })

    expect(fetchCampaign).toHaveBeenCalledWith('campaign-1')
    expect(fetchCampaignFunnels).toHaveBeenCalledWith('campaign-1')
    expect(fetchCampaignPresentations).toHaveBeenCalledWith('campaign-1')
    expect(fetchCampaignAdCampaigns).toHaveBeenCalledWith('campaign-1')
    expect(billingApi.getStatus).toHaveBeenCalled()
    expect(result.current.mediaGenerationEnabled).toBe(false)
    expect(result.current.campaignModelStrategy).toBe('speed')
    expect(result.current.isFreeUser).toBe(false)
    expect(result.current.funnels).toEqual([{ id: 'funnel-1' }])
    expect(result.current.presentations).toEqual([{ id: 'presentation-1' }])
    expect(result.current.adCampaigns).toEqual([{ id: 'ad-campaign-1' }])
    expect(result.current.metaConnected).toBe(true)
    expect(result.current.metaAdAccounts).toEqual([{ id: 'account-1', name: 'Account One' }])
    expect(result.current.metaPages).toEqual([{ id: 'page-1', name: 'Page One' }])
  })

  it('resets state to the existing safe defaults when campaign loading fails', async () => {
    vi.mocked(fetchCampaign).mockRejectedValueOnce(new Error('failed'))
    const { result } = renderHook(() => useHarness())

    await waitFor(() => {
      expect(result.current.settingsLoading).toBe(false)
    })

    expect(result.current.campaignConfig).toEqual({})
    expect(result.current.mediaGenerationEnabled).toBe(true)
    expect(result.current.campaignModelStrategy).toBe('auto')
    expect(result.current.isFreeUser).toBe(true)
    expect(result.current.funnels).toEqual([])
    expect(result.current.presentations).toEqual([])
    expect(result.current.adCampaigns).toEqual([])
  })
})
