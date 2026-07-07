import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FunnelMenuDropdown } from './FunnelMenuDropdown'

const actionsMock = vi.hoisted(() => ({
  campaigns: [
    {
      id: 'campaign-1',
      user_id: 'user-1',
      name: 'Launch Campaign',
      campaign_type: 'standard',
      status: 'active',
      config: {},
      metrics: {},
      created_at: '2026-06-28T00:00:00.000Z',
      updated_at: '2026-06-28T00:00:00.000Z',
    },
    {
      id: 'campaign-2',
      user_id: 'user-1',
      name: 'Follow-up Campaign',
      campaign_type: 'standard',
      status: 'active',
      config: { icon: 'rocket' },
      metrics: {},
      created_at: '2026-06-28T00:00:00.000Z',
      updated_at: '2026-06-28T00:00:00.000Z',
    },
  ],
  campaignsLoading: false,
  isPublished: true,
  liveUrl: 'https://vibeyfunnels.com/launch-funnel',
  copyLink: vi.fn(),
  copyId: vi.fn(),
  openInNewTab: vi.fn(),
  rename: vi.fn(),
  openSettings: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  connectCustomDomain: vi.fn(),
  duplicateInCurrentCampaign: vi.fn(),
  moveToCampaign: vi.fn(),
  copyToCampaign: vi.fn(),
  viewAnalytics: vi.fn(),
  deleteFunnel: vi.fn(),
}))

vi.mock('./use-funnel-menu-actions', () => ({
  useFunnelMenuActions: () => actionsMock,
}))

vi.mock('@/components/domains', () => ({
  ConnectCustomDomainModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="connect-domain-modal" /> : null,
}))

vi.mock('../SpacesArtifactDeleteConfirmModal', () => ({
  SpacesArtifactDeleteConfirmModal: ({
    open,
    entityName,
    onConfirm,
  }: {
    open: boolean
    entityName: string
    onConfirm: () => Promise<void>
  }) =>
    open ? (
      <div role="dialog">
        <p>Delete {entityName}</p>
        <button type="button" onClick={() => void onConfirm()}>
          Approve delete
        </button>
      </div>
    ) : null,
}))

function MenuHarness({
  onRender,
  onClose = vi.fn(),
  onChanged = vi.fn(),
  onOpenFullView = vi.fn(),
}: {
  onRender: () => void
  onClose?: () => void
  onChanged?: () => void
  onOpenFullView?: () => void
}) {
  onRender()
  return (
    <>
      <button type="button" data-testid="anchor">
        Anchor
      </button>
      <FunnelMenuDropdown
        funnel={{
          id: 'funnel-1',
          name: 'Launch Funnel',
          status: 'published',
          slug: 'launch-funnel',
          published_url: 'https://vibeyfunnels.com/launch-funnel',
          campaign_id: 'campaign-1',
        }}
        anchorRef={{ current: document.querySelector('[data-testid="anchor"]') }}
        onClose={onClose}
        onChanged={onChanged}
        onOpenFullView={onOpenFullView}
      />
    </>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('FunnelMenuDropdown', () => {
  beforeEach(() => {
    actionsMock.copyLink.mockResolvedValue(undefined)
    actionsMock.copyId.mockResolvedValue(undefined)
    actionsMock.rename.mockResolvedValue(undefined)
    actionsMock.unpublish.mockResolvedValue(undefined)
    actionsMock.connectCustomDomain.mockResolvedValue(undefined)
    actionsMock.duplicateInCurrentCampaign.mockResolvedValue(undefined)
    actionsMock.moveToCampaign.mockResolvedValue(undefined)
    actionsMock.copyToCampaign.mockResolvedValue(undefined)
    actionsMock.viewAnalytics.mockResolvedValue(undefined)
    actionsMock.deleteFunnel.mockResolvedValue(undefined)
  })

  it('renders the current command surface and delegates menu actions without render churn', async () => {
    let renderCount = 0
    const onClose = vi.fn()
    const onOpenFullView = vi.fn()

    render(
      <MenuHarness
        onClose={onClose}
        onOpenFullView={onOpenFullView}
        onRender={() => {
          renderCount += 1
        }}
      />,
    )

    expect(screen.getByText('Copy link')).toBeTruthy()
    expect(screen.getByText('Copy ID')).toBeTruthy()
    expect(screen.getByText('New tab')).toBeTruthy()
    expect(screen.getByText('Full screen view')).toBeTruthy()
    expect(screen.getByText('Rename')).toBeTruthy()
    expect(screen.getByText('Funnel settings')).toBeTruthy()
    expect(screen.getByText('Unpublish')).toBeTruthy()
    expect(screen.getByText('Connect Domain')).toBeTruthy()
    expect(screen.getByText('Duplicate')).toBeTruthy()
    expect(screen.getByText('Copy to')).toBeTruthy()
    expect(screen.getByText('Move to')).toBeTruthy()
    expect(screen.getByText('View analytics')).toBeTruthy()
    expect(screen.getByText('Delete')).toBeTruthy()

    fireEvent.click(screen.getByText('Full screen view'))
    fireEvent.click(screen.getByText('Funnel settings'))
    fireEvent.click(screen.getByText('View analytics'))

    await waitFor(() => expect(onOpenFullView).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(actionsMock.openSettings).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(actionsMock.viewAnalytics).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalledTimes(3)
    expect(renderCount).toBeLessThan(10)
  })

  it('confirms deletion through the existing Spaces modal', async () => {
    render(
      <MenuHarness
        onRender={() => {
          // Render counter is not needed for this branch.
        }}
      />,
    )

    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByRole('dialog').textContent).toContain('Delete Launch Funnel')
    fireEvent.click(screen.getByText('Approve delete'))

    await waitFor(() => expect(actionsMock.deleteFunnel).toHaveBeenCalledTimes(1))
  })
})
