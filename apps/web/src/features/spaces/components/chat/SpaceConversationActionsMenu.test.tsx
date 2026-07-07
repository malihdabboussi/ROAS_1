import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SpaceConversationActionsMenu } from './SpaceConversationActionsMenu'
import type { SpaceConversationActionsMenuProps } from './SpaceConversationActionsMenu'

const mocks = vi.hoisted(() => ({
  fetchCampaigns: vi.fn(),
}))

vi.mock('@/features/studio/services/campaign.service', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/lib/campaigns/campaign-api', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/components/ui/IconPicker', () => ({
  LucideIcon: ({ name, className }: { name: string; className?: string }) => (
    <span className={className} data-testid={`icon-${name}`} />
  ),
}))

function campaign(overrides: Record<string, unknown>) {
  return {
    id: 'campaign-1',
    user_id: 'user-1',
    name: 'Alpha',
    campaign_type: 'default',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-06-21T00:00:00.000Z',
    updated_at: '2026-06-21T00:00:00.000Z',
    ...overrides,
  }
}

function renderMenu(overrides: Partial<SpaceConversationActionsMenuProps> = {}) {
  const props: SpaceConversationActionsMenuProps = {
    open: true,
    anchor: { top: 40, left: 40 },
    isPinned: false,
    isArchived: false,
    currentCampaignId: 'campaign-1',
    showCopyLink: true,
    showShare: true,
    canEdit: true,
    canAdmin: true,
    onClose: vi.fn(),
    onCopyLink: vi.fn(),
    onShare: vi.fn(),
    onRename: vi.fn(),
    onTogglePin: vi.fn(),
    onMoveTo: vi.fn(),
    onDuplicate: vi.fn(),
    onDuplicateTo: vi.fn(),
    onToggleArchive: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }

  render(<SpaceConversationActionsMenu {...props} />)

  return props
}

describe('SpaceConversationActionsMenu', () => {
  beforeEach(() => {
    mocks.fetchCampaigns.mockResolvedValue([
      campaign({ id: 'campaign-1', name: 'Alpha', config: { icon: 'folder-kanban' } }),
      campaign({ id: 'campaign-2', name: 'Beta', config: { icon: 'rocket' } }),
    ])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads campaigns and delegates duplicate from the menu', async () => {
    const props = renderMenu()

    await waitFor(() => expect(mocks.fetchCampaigns).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))

    expect(props.onDuplicate).toHaveBeenCalledTimes(1)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})
