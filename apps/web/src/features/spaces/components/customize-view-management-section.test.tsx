import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomizeViewManagementSection } from './customize-view-management-section'
import type { Space } from '../types'
import type { ViewDef } from '../types/space-schema'

const mocks = vi.hoisted(() => ({
  fetchCampaigns: vi.fn(),
  onSharingPermissions: vi.fn(),
}))

const storeState = {
  activeSpaceId: 'space-1',
  spaces: [
    {
      id: 'space-1',
      title: 'Launch Space',
      user_id: 'owner-1',
      org_id: 'org-1',
      campaign_id: 'campaign-1',
    } as Space,
  ],
}

vi.mock('@/features/studio/services/campaign.service', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/lib/campaigns/campaign-api', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: { memberships: Array<{ org_id: string }> }) => unknown) =>
    selector({ memberships: [{ org_id: 'org-1' }] }),
}))

vi.mock('@/lib/org/org-context-store', () => ({
  useOrgStore: (selector: (state: { memberships: Array<{ org_id: string }> }) => unknown) =>
    selector({ memberships: [{ org_id: 'org-1' }] }),
}))

vi.mock('../store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}))

vi.mock('../hooks/use-space-permission', () => ({
  useSpacePermission: () => ({ canAdmin: true }),
}))

vi.mock('@/components/ui/forms/switch', () => ({
  default: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <button type="button" aria-pressed={checked} onClick={() => onCheckedChange(!checked)}>
      Switch
    </button>
  ),
}))

vi.mock('@/components/menus/MoveCopySubmenu', () => ({
  MoveCopySubmenuExclusiveGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  MoveCopySubmenu: ({
    label,
    currentCampaigns,
    memberships,
  }: {
    label: string
    currentCampaigns: unknown[]
    memberships: unknown[]
  }) => (
    <div>
      <span>{label}</span>
      <span>{`campaigns:${currentCampaigns.length}`}</span>
      <span>{`memberships:${memberships.length}`}</span>
    </div>
  ),
  moveCopyTriggerCustomize: 'move-copy-trigger',
}))

function view(overrides: Partial<ViewDef> = {}): ViewDef {
  return {
    id: 'view-1',
    name: 'Board',
    type: 'table',
    visible_fields: [],
    ...overrides,
  }
}

describe('CustomizeViewManagementSection', () => {
  beforeEach(() => {
    mocks.fetchCampaigns.mockResolvedValue([
      {
        id: 'campaign-1',
        user_id: 'owner-1',
        name: 'Launch Campaign',
        campaign_type: 'default',
        status: 'active',
        config: {},
        metrics: {},
        created_at: '2026-06-21T00:00:00.000Z',
        updated_at: '2026-06-21T00:00:00.000Z',
      },
    ])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads campaigns for move/copy actions and delegates sharing permissions', async () => {
    render(
      <CustomizeViewManagementSection
        activeView={view()}
        onViewPatch={vi.fn()}
        onViewPinToStart={vi.fn()}
        canDeleteView
        onDeleteView={vi.fn()}
        isTeamSpace
        canSaveForEveryone
        onSharingPermissions={mocks.onSharingPermissions}
      />,
    )

    await waitFor(() => expect(mocks.fetchCampaigns).toHaveBeenCalledTimes(1))

    expect(screen.getAllByText('campaigns:1')).toHaveLength(2)
    expect(screen.getAllByText('memberships:1')).toHaveLength(2)

    fireEvent.click(screen.getByText('Sharing & permissions'))

    expect(mocks.onSharingPermissions).toHaveBeenCalledTimes(1)
  })
})
