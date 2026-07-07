import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AtMentionItem } from './chat-input-at-mentions'
import { ChatInputAtMentionMenuPortal } from './chat-input-at-mention-menu-portal'

afterEach(cleanup)

function atItem(overrides: Partial<AtMentionItem> = {}): AtMentionItem {
  return {
    id: 'offer-1',
    label: 'Offer One',
    section: 'artifact',
    type: 'offer',
    ...overrides,
  }
}

function defaultProps(overrides: Partial<Parameters<typeof ChatInputAtMentionMenuPortal>[0]> = {}) {
  const portalTarget = document.createElement('div')
  document.body.appendChild(portalTarget)
  const item = atItem()
  return {
    open: true,
    portalTarget,
    floatingRef: vi.fn(),
    floatingStyles: { position: 'absolute' as const, top: 12, left: 24 },
    composerShellRect: { width: 600, left: 40 },
    crossCampaignMode: false,
    activeTab: 'artifacts' as const,
    tabs: [{ id: 'artifacts' as const, label: 'Artifacts' }],
    atQuery: '',
    atHighlight: 0,
    crossCampaignLoading: false,
    atDataLoading: false,
    artifactRows: [{ kind: 'artifact-item' as const, item }],
    mediaRows: [],
    navSlice: { kind: 'items' as const, items: [item], crossCampaignId: undefined },
    showSpaceTaskMore: false,
    showMissionMore: false,
    onBackFromCrossCampaign: vi.fn(),
    onTabChange: vi.fn(),
    onHighlight: vi.fn(),
    onCampaignSelect: vi.fn(),
    onAtSelect: vi.fn(),
    onToggleArtifactCollapsed: vi.fn(),
    onShowAllArtifacts: vi.fn(),
    onToggleMediaCollapsed: vi.fn(),
    onShowAllMedia: vi.fn(),
    onShowMoreSpaceTasks: vi.fn(),
    onShowMoreMissions: vi.fn(),
    ...overrides,
  }
}

describe('ChatInputAtMentionMenuPortal', () => {
  it('does not render while closed', () => {
    const props = defaultProps({ open: false })

    render(<ChatInputAtMentionMenuPortal {...props} />)

    expect(screen.queryByText('Offer One')).toBeNull()
  })

  it('renders into the portal target with shell-based width and delegates selection', () => {
    vi.stubGlobal('innerWidth', 1000)
    const props = defaultProps()

    render(<ChatInputAtMentionMenuPortal {...props} />)
    const menu = props.portalTarget!.querySelector(
      '[data-vibey-mention-suggestions]',
    ) as HTMLElement

    expect(menu).toBeTruthy()
    expect(menu.style.width).toBe('510px')
    fireEvent.mouseDown(screen.getByRole('button', { name: /offer one/i }))
    expect(props.onAtSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'offer-1' }),
      undefined,
    )
  })

  it('falls back to the default panel width when the shell has not been measured', () => {
    const props = defaultProps({ composerShellRect: null })

    render(<ChatInputAtMentionMenuPortal {...props} />)
    const menu = props.portalTarget!.querySelector(
      '[data-vibey-mention-suggestions]',
    ) as HTMLElement

    expect(menu.style.width).toBe('448px')
  })
})
