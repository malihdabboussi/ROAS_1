import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Campaign } from '@/lib/campaigns/campaign-api'
import type { Space } from '../../types'
import { SpaceMoreMenu, type SpaceMoreMenuProps } from './SpaceMoreMenu'

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: { memberships: Array<{ org_id: string }> }) => unknown) =>
    selector({ memberships: [{ org_id: 'org-1' }] }),
}))

vi.mock('@/lib/org/org-context-store', () => ({
  useOrgStore: (selector: (state: { memberships: Array<{ org_id: string }> }) => unknown) =>
    selector({ memberships: [{ org_id: 'org-1' }] }),
}))

vi.mock('../../hooks/use-space-permission', () => ({
  useSpacePermission: () => ({
    canAdmin: true,
    canDeleteSpace: true,
    canEdit: true,
  }),
}))

vi.mock('@/components/menus/MoveCopySubmenu', () => ({
  MoveCopySubmenuExclusiveGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  MoveCopySubmenu: ({ label }: { label: string }) => <button type="button">{label}</button>,
  moveCopyTriggerDropdown: 'move-copy-trigger',
}))

vi.mock('@/components/ui/IconPicker', () => ({
  getIconColor: () => ({ textColor: 'text-muted-foreground' }),
  IconPicker: ({ customTrigger }: { customTrigger: React.ReactNode }) => <>{customTrigger}</>,
  LucideIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}))

function space(overrides: Partial<Space> = {}): Space {
  return {
    id: 'space-1',
    title: 'Launch Space',
    user_id: 'owner-1',
    org_id: 'org-1',
    campaign_id: 'campaign-1',
    visibility: 'team',
    schema: { fields: [], views: [], icon: 'layout-grid', icon_color: 'default' },
    created_at: '2026-06-21T00:00:00.000Z',
    updated_at: '2026-06-21T00:00:00.000Z',
    ...overrides,
  } as Space
}

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-1',
    user_id: 'owner-1',
    name: 'Launch Campaign',
    campaign_type: 'default',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-06-21T00:00:00.000Z',
    updated_at: '2026-06-21T00:00:00.000Z',
    ...overrides,
  }
}

function renderMenu(overrides: Partial<SpaceMoreMenuProps> = {}) {
  const props: SpaceMoreMenuProps = {
    open: true,
    pos: { top: 20, left: 20 },
    moreMenuRef: createRef<HTMLDivElement>(),
    activeSpace: space(),
    allCampaigns: [campaign()],
    isFavorite: false,
    setMoreMenuOpen: vi.fn(),
    setSwitcherOpen: vi.fn(),
    setAutomationsOpen: vi.fn(),
    setSpaceShareOpen: vi.fn(),
    createSpace: vi.fn(async () => ({ id: 'space-copy', title: 'Launch Space (copy)' })),
    deleteSpace: vi.fn(async () => undefined),
    onToggleFavorite: vi.fn(),
    onRename: vi.fn(),
    onPatchSchemaIcon: vi.fn(),
    onOpenCampaign: vi.fn(),
    onHide: vi.fn(),
    onMoveToCampaign: vi.fn(),
    onCopyToCampaign: vi.fn(),
    ...overrides,
  }

  render(<SpaceMoreMenu {...props} />)

  return props
}

describe('SpaceMoreMenu', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(async () => undefined) },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens sharing permissions and confirms space deletion', async () => {
    const props = renderMenu()

    fireEvent.click(screen.getByRole('button', { name: /Sharing & Permissions/ }))

    expect(props.setSpaceShareOpen).toHaveBeenCalledWith(true)
    expect(props.setMoreMenuOpen).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!)

    expect(props.deleteSpace).toHaveBeenCalledWith('space-1')
  })

  it('does not expose sharing or deletion for a Personal Dashboard', () => {
    renderMenu({
      activeSpace: space({
        title: 'Personal Dashboard',
        visibility: 'private',
        space_kind: 'personal_dashboard',
      }),
    })

    expect(screen.queryByRole('button', { name: /Sharing & Permissions/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })
})
