import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShellRightPanelConnections } from './ShellRightPanelConnections'

const mocks = vi.hoisted(() => ({
  openScopePicker: vi.fn(),
  assignConversationScope: vi.fn(),
  campaigns: [{ id: 'campaign-1', name: 'Yasir VIP Upgrade' }] as Array<{
    id: string
    name: string
    program_id?: string | null
  }>,
  programs: [] as Array<{ id: string; name: string; system_kind?: string | null }>,
  space: null as { id: string; title: string } | null,
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
  useConversationScopeFallbackSpace: () => mocks.space,
  useConversationScopePrograms: () => mocks.programs,
}))

vi.mock('@/lib/conversations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/conversations')>('@/lib/conversations')
  return { ...actual, assignConversationScope: mocks.assignConversationScope }
})
vi.mock('@/lib/home', () => ({ useCampaignCacheVersion: () => 0 }))
vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

describe('ShellRightPanelConnections', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mocks.campaigns = [{ id: 'campaign-1', name: 'Yasir VIP Upgrade' }]
    mocks.programs = []
    mocks.space = null
    mocks.assignConversationScope.mockResolvedValue({ id: 'conversation-1' })
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

  it('qualifies a General space with the connected campaign', () => {
    mocks.campaigns = [{ id: 'campaign-1', name: 'Yasir Khan' }]
    mocks.space = { id: 'space-1', title: 'General' }
    render(
      <ShellRightPanelConnections
        conversation={null}
        campaignId="campaign-1"
        spaceId="space-1"
        open
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Yasir Khan General')).toBeInTheDocument()
    expect(screen.queryByText('General')).not.toBeInTheDocument()
  })

  it('shows the specific meeting name instead of the Meetings space', () => {
    mocks.space = { id: 'space-meetings', title: 'Meetings' }
    const onOpenMeeting = vi.fn()

    render(
      <ShellRightPanelConnections
        conversation={null}
        campaignId={null}
        spaceId="space-meetings"
        linkedMeeting={{ meetingItemId: 'meeting-1', spaceId: 'space-meetings' }}
        meetingTitle="Client launch review"
        open
        onOpenChange={vi.fn()}
        onOpenMeeting={onOpenMeeting}
      />,
    )

    expect(screen.getByText('Client launch review')).toBeInTheDocument()
    expect(screen.queryByText('Meetings')).not.toBeInTheDocument()
  })

  it('opens the meeting when the connection row is clicked', () => {
    mocks.space = { id: 'space-meetings', title: 'Meetings' }
    const onOpenMeeting = vi.fn()

    render(
      <ShellRightPanelConnections
        conversation={null}
        campaignId={null}
        spaceId="space-meetings"
        linkedMeeting={{ meetingItemId: 'meeting-1', spaceId: 'space-meetings' }}
        meetingTitle="Client launch review"
        open
        onOpenChange={vi.fn()}
        onOpenMeeting={onOpenMeeting}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Client launch review' }))
    expect(onOpenMeeting).toHaveBeenCalledTimes(1)
  })

  it('keeps the meeting workspace linked without a remove control', () => {
    mocks.space = { id: 'space-meetings', title: 'Meetings' }
    const onOpenMeeting = vi.fn()
    const onScopeChanged = vi.fn()

    render(
      <ShellRightPanelConnections
        conversation={null}
        campaignId={null}
        spaceId="space-meetings"
        linkedMeeting={{ meetingItemId: 'meeting-1', spaceId: 'space-meetings' }}
        meetingTitle="Client launch review"
        open
        onOpenChange={vi.fn()}
        onOpenMeeting={onOpenMeeting}
        onScopeChanged={onScopeChanged}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Remove Client launch review connection' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Client launch review' }))
    expect(onOpenMeeting).toHaveBeenCalledTimes(1)
    expect(onScopeChanged).not.toHaveBeenCalled()
  })

  it('opens a campaign connection from the row', () => {
    const onOpenCampaign = vi.fn()
    render(
      <ShellRightPanelConnections
        conversation={null}
        campaignId="campaign-1"
        spaceId={null}
        open
        onOpenChange={vi.fn()}
        onOpenCampaign={onOpenCampaign}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open Yasir VIP Upgrade' }))
    expect(onOpenCampaign).toHaveBeenCalledWith('campaign-1')
  })

  it('still lets a campaign connection be removed', () => {
    const onScopeChanged = vi.fn()
    render(
      <ShellRightPanelConnections
        conversation={null}
        campaignId="campaign-1"
        spaceId={null}
        open
        onOpenChange={vi.fn()}
        onScopeChanged={onScopeChanged}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove Yasir VIP Upgrade connection' }))
    expect(onScopeChanged).toHaveBeenCalledWith({ campaignId: null, spaceId: null })
  })

  it('shows the meeting workspace even when no live space id is attached', () => {
    render(
      <ShellRightPanelConnections
        conversation={null}
        campaignId={null}
        spaceId={null}
        linkedMeeting={{ meetingItemId: 'meeting-1', spaceId: 'space-meetings' }}
        meetingTitle="Client launch review"
        open
        onOpenChange={vi.fn()}
        onOpenMeeting={vi.fn()}
      />,
    )

    expect(screen.getByText('Client launch review')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Remove Client launch review connection' }),
    ).not.toBeInTheDocument()
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
