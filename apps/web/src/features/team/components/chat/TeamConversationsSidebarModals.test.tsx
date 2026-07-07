import type { HTMLAttributes, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SidebarCampaignRow } from '@/components/layout/sidebar/sidebar-types'
import { deleteCampaign, updateCampaign } from '@/lib/campaigns'
import { TeamConversationsSidebar } from './TeamConversationsSidebar'
import {
  buildConversation,
  buildSidebarProps,
  launchCampaign,
} from './team-conversations-sidebar.test-helpers'

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  animate?: unknown
  exit?: unknown
  initial?: unknown
  transition?: unknown
}

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ animate, exit, initial, transition, ...props }: MotionDivProps) => <div {...props} />,
  },
}))

vi.mock('@radix-ui/react-dialog', () => ({
  Close: ({ children }: { asChild?: boolean; children: ReactNode }) => <>{children}</>,
  Content: (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Description: (props: HTMLAttributes<HTMLParagraphElement>) => <p {...props} />,
  Overlay: (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Portal: ({ children }: { children: ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: ReactNode }) => <>{children}</>,
  Title: (props: HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />,
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/components/chat/ConversationChannelIcon', () => ({
  ConversationChannelIcon: () => <span data-testid="channel-icon" />,
}))

vi.mock('@/components/layout/DeleteCampaignDialog', () => ({
  DeleteCampaignDialog: ({
    campaign,
    onConfirm,
  }: {
    campaign: { id: string; name: string } | null
    onConfirm: (campaignId: string) => Promise<void>
  }) =>
    campaign ? (
      <div data-testid="delete-campaign-dialog">
        <span>{campaign.name}</span>
        <button type="button" onClick={() => void onConfirm(campaign.id)}>
          Confirm delete campaign
        </button>
      </div>
    ) : null,
}))

vi.mock('@/components/layout/NewCampaignModal', () => ({
  NewCampaignModal: ({
    editingCampaign,
    onClose,
    onCreate,
    open,
  }: {
    editingCampaign?: { name: string } | null
    onClose: () => void
    onCreate: (name: string, icon: string) => void
    open: boolean
  }) =>
    open ? (
      <div data-testid="new-campaign-modal">
        <span>{editingCampaign?.name ?? 'New campaign'}</span>
        <button
          type="button"
          onClick={() => {
            onCreate('Updated campaign', 'rocket')
            onClose()
          }}
        >
          Save campaign
        </button>
      </div>
    ) : null,
}))

vi.mock('@/components/layout/sidebar/SidebarCampaignMenuPortal', () => ({
  SidebarCampaignMenuPortal: ({
    campaign,
    onDeleteRequest,
    onEdit,
    onManageTeam,
    onPin,
    onRequestShare,
    onRequestTransfer,
  }: {
    campaign: SidebarCampaignRow
    onDeleteRequest: () => void
    onEdit: () => void
    onManageTeam?: () => void
    onPin?: () => void
    onRequestShare: () => void
    onRequestTransfer?: () => void
  }) => (
    <div data-testid="campaign-menu">
      <span>{campaign.name}</span>
      <button type="button" onClick={onEdit}>
        Edit campaign
      </button>
      <button type="button" onClick={onPin}>
        Pin campaign
      </button>
      <button type="button" onClick={onDeleteRequest}>
        Delete campaign
      </button>
      <button type="button" onClick={onRequestShare}>
        Share campaign
      </button>
      <button type="button" onClick={onRequestTransfer}>
        Transfer campaign
      </button>
      <button type="button" onClick={onManageTeam}>
        Manage campaign team
      </button>
    </div>
  ),
}))

vi.mock('@/components/org', () => ({
  ShareModal: ({ resourceId }: { resourceId: string }) => (
    <div data-testid="share-campaign-modal">{resourceId}</div>
  ),
}))

vi.mock('@/components/transfer', () => ({
  TransferDialog: ({
    entityId,
    onTransferComplete,
  }: {
    entityId: string
    onTransferComplete?: () => void
  }) => (
    <div data-testid="transfer-campaign-dialog">
      <span>{entityId}</span>
      <button type="button" onClick={onTransferComplete}>
        Complete transfer
      </button>
    </div>
  ),
}))

vi.mock('@/features/team/components/CampaignTeamManageModal', () => ({
  CampaignTeamManageModal: ({ campaignId }: { campaignId: string }) => (
    <div data-testid="manage-team-modal">{campaignId}</div>
  ),
}))

vi.mock('@/components/ui/IconPicker', () => ({
  LucideIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div data-testid="loading-orb">{text}</div>,
}))

vi.mock('@/lib/campaigns', () => ({
  createCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  updateCampaign: vi.fn(),
}))

vi.mock('@/lib/utils/sanitize-user-error', () => ({
  sanitizeUserError: (_error: unknown, fallback: string) => fallback,
}))

function openLaunchCampaignMenu() {
  const launchHeader =
    screen
      .getAllByText('Launch')
      .map((node) => node.closest('button'))
      .find((button) => button?.querySelector('[role="button"]')) ?? null
  expect(launchHeader).toBeTruthy()

  const campaignMenuTrigger = launchHeader?.querySelector('[role="button"]')
  expect(campaignMenuTrigger).toBeTruthy()

  fireEvent.click(campaignMenuTrigger as HTMLElement)
  expect(screen.getByTestId('campaign-menu')).toBeTruthy()
}

describe('TeamConversationsSidebar campaign modals', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('routes campaign menu actions through edit, pin, delete, share, transfer, and team modals', async () => {
    const onCampaignsRefresh = vi.fn().mockResolvedValue(undefined)
    const launchConversation = buildConversation({
      id: 'conversation-launch',
      campaign_id: launchCampaign.id,
      title: 'Launch plan',
      updated_at: '2026-06-24T00:20:00.000Z',
    })

    render(
      <TeamConversationsSidebar
        {...buildSidebarProps({
          sessions: [launchConversation],
          onCampaignsRefresh,
        })}
      />,
    )

    openLaunchCampaignMenu()
    fireEvent.click(screen.getByText('Edit campaign'))
    await waitFor(() => expect(screen.queryByTestId('campaign-menu')).toBeNull())
    expect(screen.getByTestId('new-campaign-modal').textContent).toContain('Launch')
    fireEvent.click(screen.getByText('Save campaign'))
    await waitFor(() =>
      expect(updateCampaign).toHaveBeenCalledWith(launchCampaign.id, {
        name: 'Updated campaign',
        config: { ...launchCampaign.config, icon: 'rocket' },
      }),
    )

    openLaunchCampaignMenu()
    fireEvent.click(screen.getByText('Pin campaign'))
    await waitFor(() => expect(screen.queryByTestId('campaign-menu')).toBeNull())
    await waitFor(() =>
      expect(updateCampaign).toHaveBeenCalledWith(launchCampaign.id, {
        config: { ...launchCampaign.config, isPinned: false },
      }),
    )

    openLaunchCampaignMenu()
    fireEvent.click(screen.getByText('Delete campaign'))
    await waitFor(() => expect(screen.queryByTestId('campaign-menu')).toBeNull())
    expect(screen.getByTestId('delete-campaign-dialog').textContent).toContain('Launch')
    fireEvent.click(screen.getByText('Confirm delete campaign'))
    await waitFor(() => expect(deleteCampaign).toHaveBeenCalledWith(launchCampaign.id))

    openLaunchCampaignMenu()
    fireEvent.click(screen.getByText('Share campaign'))
    await waitFor(() => expect(screen.queryByTestId('campaign-menu')).toBeNull())
    expect(screen.getByTestId('share-campaign-modal').textContent).toBe(launchCampaign.id)

    openLaunchCampaignMenu()
    fireEvent.click(screen.getByText('Transfer campaign'))
    await waitFor(() => expect(screen.queryByTestId('campaign-menu')).toBeNull())
    expect(screen.getByTestId('transfer-campaign-dialog').textContent).toContain(
      launchCampaign.id,
    )
    fireEvent.click(screen.getByText('Complete transfer'))
    expect(onCampaignsRefresh).toHaveBeenCalled()

    openLaunchCampaignMenu()
    fireEvent.click(screen.getByText('Manage campaign team'))
    await waitFor(() => expect(screen.queryByTestId('campaign-menu')).toBeNull())
    expect(screen.getByTestId('manage-team-modal').textContent).toBe(launchCampaign.id)
  })
})
