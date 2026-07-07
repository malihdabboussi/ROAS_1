import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  AtMentionItem,
  StudioArtifactNavRow,
  StudioMediaNavRow,
} from './chat-input-at-mentions'
import { ChatInputAtMentionMenuView } from './chat-input-at-mention-menu-view'

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

function renderAtMenu(
  overrides: Partial<Parameters<typeof ChatInputAtMentionMenuView>[0]> = {},
) {
  const artifact = atItem()
  const media = atItem({
    id: 'media-1',
    label: 'Hero Image',
    section: 'media',
    type: 'image/png',
    thumbnailUrl: 'https://cdn.test/hero.png',
  })
  const props: Parameters<typeof ChatInputAtMentionMenuView>[0] = {
    style: { top: 12, left: 24, width: 448, minWidth: 448, maxWidth: 448 },
    crossCampaignMode: false,
    activeTab: 'artifacts',
    tabs: [
      { id: 'artifacts', label: 'Artifacts' },
      { id: 'media', label: 'Media' },
      { id: 'missions', label: 'Missions' },
      { id: 'campaigns', label: 'Campaigns' },
    ],
    atQuery: '',
    atHighlight: 1,
    crossCampaignLoading: false,
    atDataLoading: false,
    artifactRows: [
      { kind: 'header', typeKey: 'offer', heading: 'Offers', count: 1, collapsed: false },
      { kind: 'artifact-item', item: artifact },
      { kind: 'artifact-more', typeKey: 'offer', remaining: 2 },
    ] satisfies StudioArtifactNavRow[],
    mediaRows: [
      { kind: 'header', typeKey: 'image', heading: 'Images', count: 1, collapsed: false },
      { kind: 'media-item', item: media },
      { kind: 'media-more', typeKey: 'image', remaining: 3 },
    ] satisfies StudioMediaNavRow[],
    navSlice: { kind: 'items', items: [artifact], crossCampaignId: undefined },
    showSpaceTaskMore: false,
    showMissionMore: false,
    onMouseDown: vi.fn(),
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
  return { props, ...render(<ChatInputAtMentionMenuView {...props} />) }
}

describe('ChatInputAtMentionMenuView', () => {
  it('renders artifact rows and delegates header, item, and show-more actions', () => {
    const { props } = renderAtMenu()

    expect(screen.getByText('Artifacts')).toBeTruthy()
    expect(screen.getByText('Offers')).toBeTruthy()
    expect(screen.getByText('Offer One')).toBeTruthy()
    expect(screen.getByRole('button', { name: /offer one/i }).className).toContain(
      'bg-hover-subtle',
    )

    fireEvent.mouseDown(screen.getByRole('button', { name: /^offers$/i }))
    expect(props.onToggleArtifactCollapsed).toHaveBeenCalledWith('offer')

    fireEvent.mouseDown(screen.getByRole('button', { name: /offer one/i }))
    expect(props.onAtSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'offer-1' }),
      undefined,
    )

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Show 2 more' }))
    expect(props.onShowAllArtifacts).toHaveBeenCalledWith('offer')
  })

  it('renders media rows with thumbnail helpers and delegates media show-more actions', () => {
    const { props, container } = renderAtMenu({ activeTab: 'media', atHighlight: 2 })

    expect(screen.getByText('Images')).toBeTruthy()
    expect(screen.getByText('Hero Image')).toBeTruthy()
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/hero.png')

    fireEvent.mouseDown(screen.getByRole('button', { name: /^images$/i }))
    expect(props.onToggleMediaCollapsed).toHaveBeenCalledWith('image')

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Show 3 more' }))
    expect(props.onShowAllMedia).toHaveBeenCalledWith('image')
  })

  it('renders campaign rows and cross-campaign back behavior', () => {
    const { props } = renderAtMenu({
      activeTab: 'campaigns',
      crossCampaignMode: true,
      navSlice: { kind: 'campaigns', items: [{ id: 'campaign-1', name: 'Launch Plan' }] },
    })

    fireEvent.mouseDown(screen.getByRole('button', { name: /back/i }))
    expect(props.onBackFromCrossCampaign).toHaveBeenCalledTimes(1)

    fireEvent.mouseDown(screen.getByRole('button', { name: /launch plan/i }))
    expect(props.onCampaignSelect).toHaveBeenCalledWith({ id: 'campaign-1', name: 'Launch Plan' })
  })

  it('renders loading and empty states using existing copy', () => {
    renderAtMenu({ crossCampaignLoading: true })
    expect(screen.getByText('Loading…')).toBeTruthy()

    cleanup()
    renderAtMenu({
      artifactRows: [],
      navSlice: { kind: 'items', items: [] },
      atQuery: 'missing',
    })
    expect(screen.getByText('No matches in this category.')).toBeTruthy()
  })
})
