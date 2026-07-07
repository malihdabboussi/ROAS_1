import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionDeliverable } from '@/lib/missions'
import { useDeliverableCampaignMenu } from './use-deliverable-campaign-menu'

const campaignMenuMocks = vi.hoisted(() => ({
  copyArtifactToCampaign: vi.fn(),
  fetchCampaigns: vi.fn(),
  moveArtifactToCampaign: vi.fn(),
  resolveArtifactCampaigns: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/campaigns', () => ({
  copyArtifactToCampaign: campaignMenuMocks.copyArtifactToCampaign,
  fetchCampaigns: campaignMenuMocks.fetchCampaigns,
  moveArtifactToCampaign: campaignMenuMocks.moveArtifactToCampaign,
  resolveArtifactCampaigns: campaignMenuMocks.resolveArtifactCampaigns,
}))

vi.mock('sonner', () => ({
  toast: {
    error: campaignMenuMocks.toastError,
    info: campaignMenuMocks.toastInfo,
    success: campaignMenuMocks.toastSuccess,
  },
}))

const baseDeliverable: MissionDeliverable = {
  id: 'deliverable-1',
  mission_id: 'mission-1',
  campaign_id: 'campaign-current',
  user_id: 'user-1',
  agent_key: 'vibey',
  type: 'presentation',
  title: 'Launch deck',
  content: null,
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  metadata: {},
  entity_id: 'presentation-1',
  entity_table: 'presentations',
  source: 'mission',
  created_at: '2026-06-28T10:00:00.000Z',
}

function renderHarness() {
  let renderCount = 0
  const onCampaignMoved = vi.fn()

  function Harness() {
    renderCount += 1
    const menu = useDeliverableCampaignMenu(baseDeliverable, { onCampaignMoved })
    return (
      <div>
        <button
          ref={menu.campaignButtonRef}
          type="button"
          onClick={menu.handleCampaignDropdownToggle}
        >
          Toggle campaign menu
        </button>
        <button type="button" onClick={() => menu.setCampaignAction('copy')}>
          Copy mode
        </button>
        <span data-testid="loading-state">{menu.campaignsLoading ? 'loading' : 'ready'}</span>
        <span data-testid="moving-state">{menu.movingToCampaign ? 'moving' : 'idle'}</span>
        {menu.campaignOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => void menu.handleSelectCampaign(option.id)}
          >
            {option.label}
            {option.isCurrent ? ' current' : ''}
          </button>
        ))}
      </div>
    )
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount, onCampaignMoved }
}

describe('useDeliverableCampaignMenu', () => {
  beforeEach(() => {
    campaignMenuMocks.copyArtifactToCampaign.mockReset()
    campaignMenuMocks.fetchCampaigns.mockReset()
    campaignMenuMocks.moveArtifactToCampaign.mockReset()
    campaignMenuMocks.resolveArtifactCampaigns.mockReset()
    campaignMenuMocks.toastInfo.mockReset()
    campaignMenuMocks.toastSuccess.mockReset()
    campaignMenuMocks.toastError.mockReset()

    campaignMenuMocks.fetchCampaigns.mockResolvedValue([
      {
        id: 'campaign-general',
        name: 'General',
        user_id: 'user-1',
        campaign_type: 'standard',
        status: 'active',
        config: { system_kind: 'general' },
        metrics: {},
        created_at: '2026-06-28T10:00:00.000Z',
        updated_at: '2026-06-28T10:00:00.000Z',
      },
      {
        id: 'campaign-current',
        name: 'Launch',
        user_id: 'user-1',
        campaign_type: 'standard',
        status: 'active',
        config: {},
        metrics: {},
        created_at: '2026-06-28T10:00:00.000Z',
        updated_at: '2026-06-28T10:00:00.000Z',
      },
      {
        id: 'campaign-target',
        name: 'Growth',
        user_id: 'user-1',
        campaign_type: 'standard',
        status: 'active',
        config: {},
        metrics: {},
        created_at: '2026-06-28T10:00:00.000Z',
        updated_at: '2026-06-28T10:00:00.000Z',
      },
    ])
    campaignMenuMocks.resolveArtifactCampaigns.mockResolvedValue({
      'presentations:presentation-1': ['campaign-current'],
    })
    campaignMenuMocks.copyArtifactToCampaign.mockResolvedValue(undefined)
    campaignMenuMocks.moveArtifactToCampaign.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
  })

  it('loads campaigns, marks current lineage, moves artifacts, and settles without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount, onCampaignMoved } = renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'Toggle campaign menu' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Launch current' })).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'General' })).toBeNull()
    expect(campaignMenuMocks.resolveArtifactCampaigns).toHaveBeenCalledWith([
      { table: 'presentations', id: 'presentation-1' },
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Growth' }))

    await waitFor(() =>
      expect(campaignMenuMocks.moveArtifactToCampaign).toHaveBeenCalledWith(
        'presentations',
        'presentation-1',
        'campaign-target',
      ),
    )
    expect(campaignMenuMocks.copyArtifactToCampaign).not.toHaveBeenCalled()
    expect(campaignMenuMocks.toastSuccess).toHaveBeenCalledWith('Moved to campaign')
    expect(onCampaignMoved).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('moving-state').textContent).toBe('idle')

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(30)

    consoleErrorSpy.mockRestore()
  })
})
