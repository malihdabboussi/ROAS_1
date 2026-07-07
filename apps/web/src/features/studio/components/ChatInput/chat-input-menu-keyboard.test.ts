import { describe, expect, it, vi } from 'vitest'
import type {
  AtMentionItem,
  StudioArtifactNavRow,
  StudioMediaNavRow,
} from './chat-input-at-mentions'
import { handleChatInputMenuKeyDown, type HandleChatInputMenuKeyDownOptions } from './chat-input-menu-keyboard'
import type { SlashItem } from './chat-input-slash-menu'

function keyboardEvent(key: string, shiftKey = false) {
  return {
    key,
    shiftKey,
    preventDefault: vi.fn(),
  }
}

function atItem(id: string, section: AtMentionItem['section'] = 'artifact'): AtMentionItem {
  return {
    id,
    label: id,
    section,
    type: section === 'media' ? 'image/png' : 'offer',
  }
}

function slashItem(id: string): SlashItem {
  return {
    id,
    key: id,
    name: id,
    description: id,
    type: 'skill',
  }
}

function defaultOptions(
  overrides: Partial<HandleChatInputMenuKeyDownOptions> = {},
): HandleChatInputMenuKeyDownOptions {
  return {
    event: keyboardEvent('Escape'),
    atMenuOpen: false,
    atNavCount: 0,
    atHighlight: -1,
    atMenuTab: 'artifacts',
    crossCampaignMode: false,
    atNavSlice: { kind: 'items', items: [] },
    artifactRows: [],
    mediaRows: [],
    onCloseAtMenu: vi.fn(),
    onExitCrossCampaign: vi.fn(),
    onAtHighlightChange: vi.fn(),
    onCampaignSelect: vi.fn(),
    onAtSelect: vi.fn(),
    onToggleArtifactCollapsed: vi.fn(),
    onShowAllArtifacts: vi.fn(),
    onToggleMediaCollapsed: vi.fn(),
    onShowAllMedia: vi.fn(),
    slashMenuOpen: false,
    slashVisibleItems: [],
    slashHighlight: 0,
    onCloseSlashMenu: vi.fn(),
    onSlashHighlightChange: vi.fn(),
    onSlashSelect: vi.fn(),
    ...overrides,
  }
}

describe('handleChatInputMenuKeyDown', () => {
  it('handles @ menu escape and highlight wrapping without selecting rows', () => {
    const exitEvent = keyboardEvent('Escape')
    const exitOptions = defaultOptions({
      event: exitEvent,
      atMenuOpen: true,
      crossCampaignMode: true,
    })

    expect(handleChatInputMenuKeyDown(exitOptions)).toBe(true)
    expect(exitEvent.preventDefault).toHaveBeenCalled()
    expect(exitOptions.onExitCrossCampaign).toHaveBeenCalled()
    expect(exitOptions.onCloseAtMenu).not.toHaveBeenCalled()

    const closeEvent = keyboardEvent('Escape')
    const closeOptions = defaultOptions({ event: closeEvent, atMenuOpen: true })

    expect(handleChatInputMenuKeyDown(closeOptions)).toBe(true)
    expect(closeEvent.preventDefault).toHaveBeenCalled()
    expect(closeOptions.onCloseAtMenu).toHaveBeenCalled()

    const downEvent = keyboardEvent('ArrowDown')
    const downOptions = defaultOptions({
      event: downEvent,
      atMenuOpen: true,
      atNavCount: 3,
    })

    expect(handleChatInputMenuKeyDown(downOptions)).toBe(true)
    const downUpdate = vi.mocked(downOptions.onAtHighlightChange).mock.calls[0]?.[0]
    expect(downUpdate?.(-1)).toBe(0)
    expect(downUpdate?.(2)).toBe(0)

    const upEvent = keyboardEvent('ArrowUp')
    const upOptions = defaultOptions({
      event: upEvent,
      atMenuOpen: true,
      atNavCount: 3,
    })

    expect(handleChatInputMenuKeyDown(upOptions)).toBe(true)
    const upUpdate = vi.mocked(upOptions.onAtHighlightChange).mock.calls[0]?.[0]
    expect(upUpdate?.(-1)).toBe(2)
    expect(upUpdate?.(0)).toBe(2)
  })

  it('selects @ menu campaigns, artifact rows, media rows, and regular items', () => {
    const campaign = { id: 'campaign-b', name: 'Campaign B' }
    const campaignEvent = keyboardEvent('Enter')
    const campaignOptions = defaultOptions({
      event: campaignEvent,
      atMenuOpen: true,
      atNavCount: 1,
      atHighlight: 0,
      atMenuTab: 'campaigns',
      atNavSlice: { kind: 'campaigns', items: [campaign] },
    })

    expect(handleChatInputMenuKeyDown(campaignOptions)).toBe(true)
    expect(campaignEvent.preventDefault).toHaveBeenCalled()
    expect(campaignOptions.onCampaignSelect).toHaveBeenCalledWith(campaign)

    const artifact = atItem('offer-a')
    const artifactRows: StudioArtifactNavRow[] = [
      { kind: 'header', typeKey: 'offer', heading: 'Offers', count: 1, collapsed: false },
      { kind: 'artifact-more', typeKey: 'offer', remaining: 2 },
      { kind: 'artifact-item', item: artifact },
    ]
    const artifactOptions = defaultOptions({
      event: keyboardEvent('Tab'),
      atMenuOpen: true,
      atNavCount: artifactRows.length,
      atHighlight: 2,
      atMenuTab: 'artifacts',
      crossCampaignMode: true,
      atNavSlice: { kind: 'items', items: [], crossCampaignId: 'campaign-b' },
      artifactRows,
    })

    expect(handleChatInputMenuKeyDown(artifactOptions)).toBe(true)
    expect(artifactOptions.onAtSelect).toHaveBeenCalledWith(artifact, 'campaign-b')

    const headerOptions = defaultOptions({
      event: keyboardEvent('Enter'),
      atMenuOpen: true,
      atNavCount: artifactRows.length,
      atHighlight: 0,
      atMenuTab: 'artifacts',
      atNavSlice: { kind: 'items', items: [] },
      artifactRows,
    })
    expect(handleChatInputMenuKeyDown(headerOptions)).toBe(true)
    expect(headerOptions.onToggleArtifactCollapsed).toHaveBeenCalledWith('offer')

    const moreOptions = defaultOptions({
      event: keyboardEvent('Enter'),
      atMenuOpen: true,
      atNavCount: artifactRows.length,
      atHighlight: 1,
      atMenuTab: 'artifacts',
      atNavSlice: { kind: 'items', items: [] },
      artifactRows,
    })
    expect(handleChatInputMenuKeyDown(moreOptions)).toBe(true)
    expect(moreOptions.onShowAllArtifacts).toHaveBeenCalledWith('offer')

    const media = atItem('image-a', 'media')
    const mediaRows: StudioMediaNavRow[] = [
      { kind: 'header', typeKey: 'image', heading: 'Images', count: 1, collapsed: false },
      { kind: 'media-more', typeKey: 'image', remaining: 2 },
      { kind: 'media-item', item: media },
    ]
    const mediaItemOptions = defaultOptions({
      event: keyboardEvent('Enter'),
      atMenuOpen: true,
      atNavCount: mediaRows.length,
      atHighlight: 2,
      atMenuTab: 'media',
      atNavSlice: { kind: 'items', items: [], crossCampaignId: 'campaign-c' },
      crossCampaignMode: true,
      mediaRows,
    })
    expect(handleChatInputMenuKeyDown(mediaItemOptions)).toBe(true)
    expect(mediaItemOptions.onAtSelect).toHaveBeenCalledWith(media, 'campaign-c')

    const mission = atItem('mission-a', 'mission')
    const missionOptions = defaultOptions({
      event: keyboardEvent('Enter'),
      atMenuOpen: true,
      atNavCount: 1,
      atHighlight: 0,
      atMenuTab: 'missions',
      atNavSlice: { kind: 'items', items: [mission] },
    })
    expect(handleChatInputMenuKeyDown(missionOptions)).toBe(true)
    expect(missionOptions.onAtSelect).toHaveBeenCalledWith(mission, undefined)
  })

  it('handles slash menu escape, wrapping navigation, and selection after @ handling falls through', () => {
    const closeEvent = keyboardEvent('Escape')
    const closeOptions = defaultOptions({
      event: closeEvent,
      slashMenuOpen: true,
      slashVisibleItems: [slashItem('brief')],
    })

    expect(handleChatInputMenuKeyDown(closeOptions)).toBe(true)
    expect(closeEvent.preventDefault).toHaveBeenCalled()
    expect(closeOptions.onCloseSlashMenu).toHaveBeenCalled()

    const items = [slashItem('brief'), slashItem('research')]
    const downEvent = keyboardEvent('ArrowDown')
    const downOptions = defaultOptions({
      event: downEvent,
      slashMenuOpen: true,
      slashVisibleItems: items,
    })

    expect(handleChatInputMenuKeyDown(downOptions)).toBe(true)
    const downUpdate = vi.mocked(downOptions.onSlashHighlightChange).mock.calls[0]?.[0]
    expect(downUpdate?.(1)).toBe(0)

    const enterEvent = keyboardEvent('Enter')
    const enterOptions = defaultOptions({
      event: enterEvent,
      atMenuOpen: true,
      atNavCount: 0,
      slashMenuOpen: true,
      slashVisibleItems: items,
      slashHighlight: 1,
    })

    expect(handleChatInputMenuKeyDown(enterOptions)).toBe(true)
    expect(enterEvent.preventDefault).toHaveBeenCalled()
    expect(enterOptions.onSlashSelect).toHaveBeenCalledWith(items[1])
  })

  it('ignores keys that are not menu keyboard commands', () => {
    const event = keyboardEvent('a')
    const options = defaultOptions({
      event,
      atMenuOpen: true,
      atNavCount: 2,
      slashMenuOpen: true,
      slashVisibleItems: [slashItem('brief')],
    })

    expect(handleChatInputMenuKeyDown(options)).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
