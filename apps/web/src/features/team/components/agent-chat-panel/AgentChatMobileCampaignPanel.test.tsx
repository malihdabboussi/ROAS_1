import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentChatMobileCampaignPanel } from './AgentChatMobileCampaignPanel'

vi.mock('@/components/chat/CampaignPreviewPanelAdapter', () => ({
  CampaignPreviewPanel: ({ mobilePreviewMode }: { mobilePreviewMode?: boolean }) => (
    <div data-testid="campaign-preview">{mobilePreviewMode ? 'preview' : 'campaign'}</div>
  ),
}))

vi.mock('@/components/ui/IconPicker', () => ({
  LucideIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}))

const campaignOptions = [
  { id: 'general', name: 'General', icon: 'users' },
  { id: 'campaign-2', name: 'Launch Two', icon: null },
]

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof AgentChatMobileCampaignPanel>> = {},
) {
  const props: React.ComponentProps<typeof AgentChatMobileCampaignPanel> = {
    activeCampaignId: 'general',
    activeCampaignName: 'General',
    mobileCampaignSubScreen: 'campaign',
    mobileCampaignSettingsOpen: false,
    mobilePreviewInfo: { name: '', hasSettings: false },
    mobileCampaignPickerOpen: false,
    mobileCampaignSwitcherOptions: campaignOptions,
    onMobileCampaignPickerOpenChange: vi.fn(),
    onCampaignPanelOpenChange: vi.fn(),
    onMobileCampaignSubScreenChange: vi.fn(),
    onMobilePreviewInfoChange: vi.fn(),
    onSelectCampaignFromMobilePicker: vi.fn(),
    onMobileSettingsOverlayChange: vi.fn(),
    ...overrides,
  }

  return { ...render(<AgentChatMobileCampaignPanel {...props} />), props }
}

describe('AgentChatMobileCampaignPanel', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders campaign picker options, selects campaigns, and closes on outside click', () => {
    const onMobileCampaignPickerOpenChange = vi.fn()
    const onSelectCampaignFromMobilePicker = vi.fn()

    renderPanel({
      mobileCampaignPickerOpen: true,
      onMobileCampaignPickerOpenChange,
      onSelectCampaignFromMobilePicker,
    })

    expect(
      screen.getByRole('button', { name: 'Switch campaign' }).getAttribute('aria-expanded'),
    ).toBe('true')
    expect(screen.getByRole('option', { name: /General/ }).getAttribute('aria-selected')).toBe(
      'true',
    )
    fireEvent.click(screen.getByRole('option', { name: /Launch Two/ }))
    expect(onSelectCampaignFromMobilePicker).toHaveBeenCalledWith('campaign-2')

    fireEvent.mouseDown(document.body)
    expect(onMobileCampaignPickerOpenChange).toHaveBeenCalledWith(false)
  })

  it('dispatches preview back events and restores the campaign title from settings preview', () => {
    const onMobileCampaignSubScreenChange = vi.fn()
    const onMobilePreviewInfoChange = vi.fn()
    const backListener = vi.fn()
    window.addEventListener('mobile-artifact-back', backListener)

    const { rerender, props } = renderPanel({
      activeCampaignName: 'Launch',
      mobileCampaignSubScreen: 'preview',
      mobileCampaignSettingsOpen: true,
      mobilePreviewInfo: { name: 'Artifact', hasSettings: true },
      onMobileCampaignSubScreenChange,
      onMobilePreviewInfoChange,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Back to campaign' }))

    expect(onMobileCampaignSubScreenChange).toHaveBeenCalledWith('campaign')
    expect(backListener).toHaveBeenCalledTimes(1)

    rerender(
      <AgentChatMobileCampaignPanel
        {...props}
        mobileCampaignSettingsOpen={false}
        mobilePreviewInfo={{ name: 'Settings', hasSettings: false }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Back to campaign' }))

    expect(onMobilePreviewInfoChange).toHaveBeenCalledWith({
      name: 'Launch',
      hasSettings: true,
    })
    expect(backListener).toHaveBeenCalledTimes(2)
    window.removeEventListener('mobile-artifact-back', backListener)
  })
})
