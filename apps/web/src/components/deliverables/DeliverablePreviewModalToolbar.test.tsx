import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrainOption, ViewMode } from './deliverable-preview-modal.types'
import type {
  CampaignPickerOption,
  CampaignToCampaignAction,
} from './use-deliverable-campaign-menu'
import type { MissionDeliverable } from '@/lib/missions'

import { DeliverablePreviewModalToolbar } from './DeliverablePreviewModalToolbar'

const toolbarMocks = vi.hoisted(() => ({
  handleBrainDropdownToggle: vi.fn(),
  handleCampaignDropdownToggle: vi.fn(),
  handleSelectCampaign: vi.fn(),
  handleStartConversation: vi.fn(),
  onClose: vi.fn(),
  setBrainDropdownOpen: vi.fn(),
  setCampaignAction: vi.fn(),
  setConfirmBrain: vi.fn(),
  setCopied: vi.fn(),
  writeText: vi.fn(),
}))

const fileDeliverable: MissionDeliverable = {
  id: 'deliverable-file',
  mission_id: 'mission-1',
  campaign_id: 'campaign-current',
  user_id: 'user-1',
  agent_key: 'vibey',
  type: 'file',
  title: 'Original.pdf',
  content: null,
  file_url: 'https://files.example/original.pdf',
  file_name: 'Original.pdf',
  file_size: 1234,
  mime_type: 'application/pdf',
  metadata: {},
  entity_id: null,
  entity_table: null,
  source: 'mission',
  created_at: '2026-06-28T12:20:00.000Z',
}

const brainOptions: BrainOption[] = [
  { id: 'user', label: 'Your Brain', type: 'user' },
  {
    id: 'campaign:launch',
    label: 'Launch Campaign',
    type: 'campaign',
    campaignId: 'campaign-1',
  },
  { id: 'agent:growth', label: 'Growth Agent', type: 'agent', brainId: 'brain-growth' },
]

const campaignOptions: CampaignPickerOption[] = [
  { id: 'campaign-current', label: 'Launch', isCurrent: true },
  { id: 'campaign-target', label: 'Growth', isCurrent: false },
]

function renderToolbar() {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    const [viewMode, setViewMode] = useState<ViewMode>('wide')
    const [campaignAction, updateCampaignAction] =
      useState<CampaignToCampaignAction>('move')
    const brainButtonRef = useRef<HTMLButtonElement>(null)
    const campaignButtonRef = useRef<HTMLButtonElement>(null)

    const setCampaignAction: Dispatch<SetStateAction<CampaignToCampaignAction>> = (value) => {
      updateCampaignAction((previous) => {
        const next = typeof value === 'function' ? value(previous) : value
        toolbarMocks.setCampaignAction(next)
        return next
      })
    }

    return (
      <DeliverablePreviewModalToolbar
        deliverable={fileDeliverable}
        onClose={toolbarMocks.onClose}
        isTextType={false}
        viewMode={viewMode}
        setViewMode={setViewMode}
        copied={false}
        effectiveContent="Body copy"
        brainButtonRef={brainButtonRef}
        brainDropdownOpen
        handleBrainDropdownToggle={toolbarMocks.handleBrainDropdownToggle}
        brainsLoading={false}
        brainDropdownPos={{ top: 20, left: 40, right: 60 }}
        isMobileToolbar={false}
        brainOptions={brainOptions}
        setConfirmBrain={toolbarMocks.setConfirmBrain}
        setBrainDropdownOpen={toolbarMocks.setBrainDropdownOpen}
        handleStartConversation={toolbarMocks.handleStartConversation}
        setCopied={toolbarMocks.setCopied}
        addToCampaignEligible
        campaignButtonRef={campaignButtonRef}
        campaignDropdownOpen
        handleCampaignDropdownToggle={toolbarMocks.handleCampaignDropdownToggle}
        campaignsLoading={false}
        movingToCampaign={false}
        campaignOptions={campaignOptions}
        campaignDropdownPos={{ top: 20, left: 80, right: 100 }}
        campaignAction={campaignAction}
        setCampaignAction={setCampaignAction}
        handleSelectCampaign={toolbarMocks.handleSelectCampaign}
      />
    )
  }

  const result = render(<Harness />)
  return { ...result, getRenderCount: () => renderCount }
}

describe('DeliverablePreviewModalToolbar', () => {
  beforeEach(() => {
    for (const value of Object.values(toolbarMocks)) {
      value.mockReset()
    }
    toolbarMocks.writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: toolbarMocks.writeText },
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    cleanup()
  })

  it('renders file, campaign, and Brain actions without render churn', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container, getRenderCount } = renderToolbar()

    const actionButtons = container.querySelectorAll('button.btn-icon-bare')
    const copyLinkButton = actionButtons[0]
    if (!copyLinkButton) throw new Error('Expected copy link button')
    fireEvent.click(copyLinkButton)
    expect(toolbarMocks.writeText).toHaveBeenCalledWith('https://files.example/original.pdf')
    expect(toolbarMocks.setCopied).toHaveBeenCalledWith(true)

    const downloadLink = container.querySelector<HTMLAnchorElement>('a[download="Original.pdf"]')
    expect(downloadLink?.href).toBe('https://files.example/original.pdf')

    fireEvent.click(screen.getByRole('button', { name: 'Copy to' }))
    expect(toolbarMocks.setCampaignAction).toHaveBeenCalledWith('copy')

    fireEvent.click(screen.getByRole('button', { name: 'Growth' }))
    expect(toolbarMocks.handleSelectCampaign).toHaveBeenCalledWith('campaign-target')

    fireEvent.click(screen.getByRole('button', { name: 'Your Brain user' }))
    expect(toolbarMocks.setConfirmBrain).toHaveBeenCalledWith(brainOptions[0])
    expect(toolbarMocks.setBrainDropdownOpen).toHaveBeenCalledWith(false)

    const discussButton = actionButtons[actionButtons.length - 2]
    if (!discussButton) throw new Error('Expected discuss button')
    fireEvent.click(discussButton)
    expect(toolbarMocks.handleStartConversation).toHaveBeenCalledTimes(1)

    const closeButton = actionButtons[actionButtons.length - 1]
    if (!closeButton) throw new Error('Expected close button')
    fireEvent.click(closeButton)
    expect(toolbarMocks.onClose).toHaveBeenCalledTimes(1)

    vi.runOnlyPendingTimers()
    expect(toolbarMocks.setCopied).toHaveBeenCalledWith(false)

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(8)

    consoleErrorSpy.mockRestore()
  })
})
