import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PaidAdsMetaSetupBar } from './PaidAdsMetaSetupBar'

const openWorkspaceSettings = vi.fn()
const fetchCampaign = vi.fn()
const updateCampaign = vi.fn()
const getMappedPageGraderMetaContext = vi.fn()
const getPaidAdsMetaConnectionStatus = vi.fn()

vi.mock('@/lib/settings/workspace-settings-modal-context', () => ({
  useWorkspaceSettingsModal: () => ({ openWorkspaceSettings }),
}))

vi.mock('@/lib/campaigns/campaign-api', () => ({
  fetchCampaign: (...args: unknown[]) => fetchCampaign(...args),
  updateCampaign: (...args: unknown[]) => updateCampaign(...args),
}))

vi.mock('@/features/spaces/services/page-grader-send.service', () => ({
  getMappedPageGraderMetaContext: (...args: unknown[]) => getMappedPageGraderMetaContext(...args),
}))

vi.mock('@/lib/artifacts/paid-ads-api', () => ({
  getPaidAdsMetaConnectionStatus: (...args: unknown[]) => getPaidAdsMetaConnectionStatus(...args),
}))

vi.mock('@/components/ui/forms/SettingsDropdown', () => ({
  SettingsDropdown: ({
    value,
    options,
    onChange,
    placeholder,
  }: {
    value: string
    options: Array<{ value: string; label: string }>
    onChange: (value: string) => void
    placeholder?: string
  }) => (
    <select
      aria-label={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

describe('PaidAdsMetaSetupBar', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    fetchCampaign.mockResolvedValue({ id: 'campaign-1', config: {} })
    updateCampaign.mockImplementation(async (_id, patch) => ({ id: 'campaign-1', ...patch }))
    getMappedPageGraderMetaContext.mockResolvedValue(null)
  })

  it('keeps Paid Ads in draft mode and links directly to Meta setup when disconnected', async () => {
    getPaidAdsMetaConnectionStatus.mockResolvedValue({
      connected: false,
      adAccounts: null,
      pages: null,
    })

    render(<PaidAdsMetaSetupBar campaignId="campaign-1" spaceId="space-1" />)

    expect(await screen.findByText('Draft mode')).toBeInTheDocument()
    expect(screen.getByText(/Meta is not connected/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Connect Meta' }))
    expect(openWorkspaceSettings).toHaveBeenCalledWith('integrations', {
      integrationsFocusIntegrationId: 'meta',
    })
  })

  it('surfaces the PageGrader account recommendation before Meta is connected', async () => {
    getPaidAdsMetaConnectionStatus.mockResolvedValue({
      connected: false,
      adAccounts: null,
      pages: null,
    })
    getMappedPageGraderMetaContext.mockResolvedValue({
      connected: true,
      recommended_ad_account_id: 'act_42',
      accounts: [{ id: 'act_42', name: 'Sakha Media' }],
      pages: [],
    })

    render(<PaidAdsMetaSetupBar campaignId="campaign-1" spaceId="space-1" />)

    expect(await screen.findByText(/PageGrader found Sakha Media/i)).toBeInTheDocument()
  })

  it('maps the selected Meta account and Page into the campaign defaults', async () => {
    getPaidAdsMetaConnectionStatus.mockResolvedValue({
      connected: true,
      adAccounts: [
        { id: 'act_42', name: 'Sakha Media' },
        { id: 'act_84', name: 'Second Account' },
      ],
      pages: [{ id: 'page_7', name: 'Sakha Media Group' }],
    })
    fetchCampaign.mockResolvedValue({
      id: 'campaign-1',
      config: {
        existing: true,
        meta_defaults: { meta_ad_account_id: 'act_42' },
      },
    })

    render(<PaidAdsMetaSetupBar campaignId="campaign-1" spaceId="space-1" />)

    expect(await screen.findByText('Finish Meta setup')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Choose Facebook Page'), {
      target: { value: 'page_7' },
    })

    await waitFor(() =>
      expect(updateCampaign).toHaveBeenCalledWith('campaign-1', {
        config: {
          existing: true,
          meta_defaults: {
            meta_ad_account_id: 'act_42',
            meta_page_id: 'page_7',
          },
          meta_asset_profiles: [
            {
              id: 'default',
              label: 'Default',
              ad_account_id: 'act_42',
              page_id: 'page_7',
              instagram_user_id: null,
              pixel_id: null,
            },
          ],
        },
      }),
    )
    expect(await screen.findByText('Meta mounted')).toBeInTheDocument()
  })

  it('refreshes connection state when the user returns from Meta', async () => {
    getPaidAdsMetaConnectionStatus
      .mockResolvedValueOnce({ connected: false, adAccounts: null, pages: null })
      .mockResolvedValueOnce({
        connected: true,
        adAccounts: [{ id: 'act_42', name: 'Sakha Media' }],
        pages: [{ id: 'page_7', name: 'Sakha Media Group' }],
      })

    render(<PaidAdsMetaSetupBar campaignId="campaign-1" spaceId="space-1" />)
    expect(await screen.findByText('Draft mode')).toBeInTheDocument()

    act(() => window.dispatchEvent(new Event('focus')))

    expect(await screen.findByText('Finish Meta setup')).toBeInTheDocument()
    expect(getPaidAdsMetaConnectionStatus).toHaveBeenCalledTimes(2)
  })

  it('restores the previous mapping when saving fails', async () => {
    getPaidAdsMetaConnectionStatus.mockResolvedValue({
      connected: true,
      adAccounts: [{ id: 'act_42', name: 'Sakha Media' }],
      pages: [{ id: 'page_7', name: 'Sakha Media Group' }],
    })
    updateCampaign.mockRejectedValueOnce(new Error('network'))

    render(<PaidAdsMetaSetupBar campaignId="campaign-1" spaceId="space-1" />)
    expect(await screen.findByText('Finish Meta setup')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Choose Meta ad account'), {
      target: { value: 'act_42' },
    })

    expect(
      await screen.findByText('We could not save the Meta mapping. Try again.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Choose Meta ad account')).toHaveValue('')
  })
})
