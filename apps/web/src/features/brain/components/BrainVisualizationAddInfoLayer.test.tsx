import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrainVisualizationAddInfoLayer } from './BrainVisualizationAddInfoLayer'

const mocks = vi.hoisted(() => ({
  campaignAddInfoPanel: vi.fn(),
  customerAddInfoPanel: vi.fn(),
  userAddInfoPanel: vi.fn(),
}))

vi.mock('./CampaignAddInfoPanel', () => ({
  default: (props: { campaignId: string | null; onImported: () => void; visible: boolean }) => {
    mocks.campaignAddInfoPanel(props)
    return <div data-testid="campaign-add-info" data-visible={String(props.visible)} />
  },
}))

vi.mock('./CustomerAddInfoPanel', () => ({
  default: (props: { brainId: string | null; visible: boolean }) => {
    mocks.customerAddInfoPanel(props)
    return <div data-testid="customer-add-info" data-visible={String(props.visible)} />
  },
}))

vi.mock('./UserAddInfoPanel', () => ({
  default: (props: { visible: boolean }) => {
    mocks.userAddInfoPanel(props)
    return <div data-testid="user-add-info" data-visible={String(props.visible)} />
  },
}))

function renderAddInfoLayer(
  overrides: Partial<Parameters<typeof BrainVisualizationAddInfoLayer>[0]> = {},
) {
  const props: Parameters<typeof BrainVisualizationAddInfoLayer>[0] = {
    isMobileBrain: false,
    onCampaignImported: vi.fn(),
    selectedScope: {
      brainId: null,
      scopeType: 'user',
    },
    topRightScopeReady: true,
    ...overrides,
  }

  return {
    ...render(<BrainVisualizationAddInfoLayer {...props} />),
    props,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('BrainVisualizationAddInfoLayer', () => {
  it('forwards desktop Add Info visibility for user, campaign, and customer scopes', () => {
    const onCampaignImported = vi.fn()

    renderAddInfoLayer({
      onCampaignImported,
      selectedScope: {
        brainId: 'brain-campaign',
        scopeType: 'campaign',
        campaignId: 'campaign-1',
      },
    })

    expect(mocks.userAddInfoPanel).toHaveBeenCalledWith({ visible: false })
    expect(mocks.campaignAddInfoPanel).toHaveBeenCalledWith({
      visible: true,
      campaignId: 'campaign-1',
      onImported: onCampaignImported,
    })
    expect(mocks.customerAddInfoPanel).toHaveBeenCalledWith({
      visible: false,
      brainId: 'brain-campaign',
    })
  })

  it('does not render desktop panel components until the scope runtime is ready', () => {
    renderAddInfoLayer({ topRightScopeReady: false })

    expect(mocks.userAddInfoPanel).not.toHaveBeenCalled()
    expect(mocks.campaignAddInfoPanel).not.toHaveBeenCalled()
    expect(mocks.customerAddInfoPanel).not.toHaveBeenCalled()
  })

  it('dispatches the existing mobile Add Information event from the mobile button', () => {
    const mobileAddInfo = vi.fn()
    window.addEventListener('mobile-brain-add-info', mobileAddInfo)

    try {
      renderAddInfoLayer({ isMobileBrain: true })

      fireEvent.click(screen.getByRole('button', { name: 'Add Information' }))

      expect(mobileAddInfo).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('mobile-brain-add-info', mobileAddInfo)
    }
  })
})
