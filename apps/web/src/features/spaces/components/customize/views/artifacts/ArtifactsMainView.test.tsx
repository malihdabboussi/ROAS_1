import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ViewDef } from '../../../../types/space-schema'
import { ArtifactsMainView } from './ArtifactsMainView'

const mocks = vi.hoisted(() => ({
  fetchCampaignFunnels: vi.fn(),
  GroupByToolbarPopover: vi.fn(
    ({ open, activeView }: { open: boolean; activeView: ViewDef }) =>
      open ? <div data-testid="group-popover">group:{activeView.group_by ?? 'none'}</div> : null,
  ),
  CustomizeViewManagementSection: vi.fn(() => (
    <div data-testid="view-management">view management</div>
  )),
  FunnelsListSubView: vi.fn(() => <div data-testid="funnels-list">Funnels list</div>),
  FunnelSettingsSubView: vi.fn(() => <div data-testid="funnel-settings">Funnel settings</div>),
  IconPicker: vi.fn(({ customTrigger }: { customTrigger: ReactNode }) => (
    <button type="button" aria-label="Change icon">
      {customTrigger}
    </button>
  )),
  LucideIcon: vi.fn(({ name }: { name: string }) => <span data-testid={`icon-${name}`} />),
}))

vi.mock('@/lib/artifacts/funnel-preview-api', () => ({
  fetchCampaignFunnels: mocks.fetchCampaignFunnels,
}))

vi.mock('@/components/ui/IconPicker', () => ({
  IconPicker: mocks.IconPicker,
  LucideIcon: mocks.LucideIcon,
}))

vi.mock('../../../customize-view-management-section', () => ({
  CustomizeViewManagementSection: mocks.CustomizeViewManagementSection,
}))

vi.mock('../../../group-by-toolbar-popover', () => ({
  GroupByToolbarPopover: mocks.GroupByToolbarPopover,
}))

vi.mock('../../funnels-customize/FunnelsListSubView', () => ({
  FunnelsListSubView: mocks.FunnelsListSubView,
}))

vi.mock('../../funnels-customize/FunnelSettingsSubView', () => ({
  FunnelSettingsSubView: mocks.FunnelSettingsSubView,
}))

const activeView: ViewDef = {
  id: 'view-funnels',
  type: 'funnels',
  name: 'Funnels',
  icon: 'filter',
  icon_color: 'purple',
  group_by: 'status',
  funnels_config: {
    funnel_card_fields: ['status', 'created_at', 'unknown'],
  },
}

function renderArtifactsMainView(overrides: Partial<Parameters<typeof ArtifactsMainView>[0]> = {}) {
  const props: Parameters<typeof ArtifactsMainView>[0] = {
    activeView,
    viewIconName: 'filter',
    viewIconColor: { textColor: 'text-primary' },
    nameDraft: 'Funnels',
    setNameDraft: vi.fn(),
    onViewPatch: vi.fn(async () => {}),
    onViewPinToStart: vi.fn(async () => {}),
    canDeleteView: true,
    onDeleteView: vi.fn(async () => {}),
    onClose: vi.fn(),
    artifactCampaignId: 'campaign-1',
    onOpenFunnelsCardFields: vi.fn(),
    ...overrides,
  }

  return {
    props,
    ...render(<ArtifactsMainView {...props} />),
  }
}

describe('ArtifactsMainView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchCampaignFunnels.mockResolvedValue([
      { id: 'funnel-1', name: 'Lead funnel', funnel_type: 'lead_magnet' },
      { id: 'funnel-2', name: 'Main website', funnel_type: 'website' },
      { id: 'funnel-3', name: 'Sales funnel', funnel_type: 'sales' },
    ])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders artifact controls, loads funnel count, opens fields/list controls, and settles', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { props, rerender } = renderArtifactsMainView()

    expect(screen.getByDisplayValue('Funnels')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fields.*2 shown/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Group.*Status/i })).toBeInTheDocument()
    expect(screen.getByTestId('view-management')).toBeInTheDocument()

    await waitFor(() => expect(mocks.fetchCampaignFunnels).toHaveBeenCalledWith('campaign-1'))
    await waitFor(() => expect(screen.getByRole('button', { name: /Funnels.*2/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Fields.*2 shown/i }))
    expect(props.onOpenFunnelsCardFields).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Group.*Status/i }))
    expect(screen.getByTestId('group-popover')).toHaveTextContent('group:status')

    fireEvent.click(screen.getByRole('button', { name: /Funnels.*2/i }))
    expect(screen.getByTestId('funnels-list')).toBeInTheDocument()

    rerender(<ArtifactsMainView {...props} nameDraft="Funnels updated" />)

    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).match(/maximum update depth|too many re-renders/i)),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })
})
