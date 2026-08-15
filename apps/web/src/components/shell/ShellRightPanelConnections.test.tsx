import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShellRightPanelConnections } from './ShellRightPanelConnections'

const mocks = vi.hoisted(() => ({
  openScopePicker: vi.fn(),
  campaigns: [{ id: 'campaign-1', name: 'Yasir VIP Upgrade' }],
}))

vi.mock('@/components/conversations', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    ConversationScopePicker: forwardRef(function MockConversationScopePicker(_props, ref) {
      useImperativeHandle(ref, () => ({ openMenuFromBanner: mocks.openScopePicker }))
      return <div data-testid="scope-picker">Scope</div>
    }),
  }
})

vi.mock('@/components/conversations/use-conversation-scope-data', () => ({
  useConversationScopeCampaigns: () => mocks.campaigns,
  useConversationScopeFallbackCampaign: () => null,
  useConversationScopeFallbackSpace: () => null,
}))

vi.mock('@/lib/conversations', () => ({ assignConversationScope: vi.fn() }))
vi.mock('@/lib/home', () => ({ useCampaignCacheVersion: () => 0 }))
vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

describe('ShellRightPanelConnections', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const renderPanel = (open: boolean, onOpenChange = vi.fn()) => {
    render(
      <ShellRightPanelConnections
        conversation={null}
        campaignId="campaign-1"
        spaceId={null}
        open={open}
        onOpenChange={onOpenChange}
      />,
    )
    return onOpenChange
  }

  it('names the connected campaign rather than its type', () => {
    renderPanel(true)

    expect(screen.getByText('Yasir VIP Upgrade')).toBeInTheDocument()
  })

  it('keeps the scope picker mounted while collapsed', () => {
    renderPanel(false)

    expect(screen.queryByText('Yasir VIP Upgrade')).not.toBeInTheDocument()
    // The picker lives outside the collapsible body on purpose — collapsing
    // must not unmount it, or the "+" and the shell's open-picker request
    // would both stop working.
    expect(screen.getByTestId('scope-picker')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add connection' })).toBeInTheDocument()
  })

  it('expands the section when adding from a collapsed state', () => {
    const onOpenChange = renderPanel(false)

    fireEvent.click(screen.getByRole('button', { name: 'Add connection' }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(mocks.openScopePicker).toHaveBeenCalledTimes(1)
  })
})
