import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudioFunnelMenuDropdown } from './StudioFunnelMenuDropdown'

const actionsMock = vi.hoisted(() => ({
  campaigns: [],
  campaignsLoading: false,
  isPublished: false,
  liveUrl: null,
  copyLink: vi.fn(),
  copyId: vi.fn(),
  openInNewTab: vi.fn(),
  rename: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  connectCustomDomain: vi.fn(),
  duplicateInCurrentCampaign: vi.fn(),
  moveToCampaign: vi.fn(),
  copyToCampaign: vi.fn(),
  deleteFunnel: vi.fn(),
}))

vi.mock('@/lib/artifacts/use-funnel-menu-actions', () => ({
  useFunnelMenuActions: () => actionsMock,
}))

vi.mock('./ConnectCustomDomainModal', () => ({
  ConnectCustomDomainModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="connect-domain-modal" /> : null,
}))

function StudioFunnelMenuHarness({ onRender }: { onRender: () => void }) {
  onRender()
  return (
    <>
      <button type="button" data-testid="anchor">
        Anchor
      </button>
      <StudioFunnelMenuDropdown
        funnel={{
          id: 'funnel-1',
          name: 'Launch Funnel',
          status: 'draft',
          slug: 'launch-funnel',
          published_url: null,
          campaign_id: 'campaign-1',
        }}
        anchorRef={{ current: document.querySelector('[data-testid="anchor"]') }}
        onClose={vi.fn()}
        onChanged={vi.fn()}
        onOpenFullView={vi.fn()}
      />
    </>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('StudioFunnelMenuDropdown', () => {
  beforeEach(() => {
    actionsMock.deleteFunnel.mockReset()
    actionsMock.deleteFunnel.mockResolvedValue(undefined)
  })

  it('renders Studio-owned funnel actions without Spaces analytics and confirms delete', async () => {
    let renderCount = 0
    render(
      <StudioFunnelMenuHarness
        onRender={() => {
          renderCount += 1
        }}
      />,
    )

    expect(screen.getByText('Copy ID')).toBeTruthy()
    expect(screen.getByText('Rename')).toBeTruthy()
    expect(screen.getByText('Funnel settings')).toBeTruthy()
    expect(screen.getByText('Publish')).toBeTruthy()
    expect(screen.getByText('Connect Domain')).toBeTruthy()
    expect(screen.queryByText('View analytics')).toBeNull()

    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(screen.getByText('Approve delete'))

    await waitFor(() => expect(actionsMock.deleteFunnel).toHaveBeenCalledTimes(1))
    expect(renderCount).toBeLessThan(10)
  })
})
