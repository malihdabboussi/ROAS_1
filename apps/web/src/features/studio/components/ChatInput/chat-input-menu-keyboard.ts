import type {
  AtMentionItem,
  StudioArtifactNavRow,
  StudioAtMenuTabId,
  StudioMediaNavRow,
} from './chat-input-at-mentions'
import type { SlashItem } from './chat-input-slash-menu'

type ChatInputMenuKeyboardEvent = {
  key: string
  shiftKey: boolean
  preventDefault: () => void
}

type HighlightUpdater = (index: number) => number

export type ChatInputMenuAtNavSlice =
  | { kind: 'items'; items: AtMentionItem[]; crossCampaignId?: string }
  | { kind: 'campaigns'; items: Array<{ id: string; name: string }> }

export interface HandleChatInputMenuKeyDownOptions {
  event: ChatInputMenuKeyboardEvent
  atMenuOpen: boolean
  atNavCount: number
  atHighlight: number
  atMenuTab: StudioAtMenuTabId
  crossCampaignMode: boolean
  atNavSlice: ChatInputMenuAtNavSlice
  artifactRows: readonly StudioArtifactNavRow[]
  mediaRows: readonly StudioMediaNavRow[]
  onCloseAtMenu: () => void
  onExitCrossCampaign: () => void
  onAtHighlightChange: (updater: HighlightUpdater) => void
  onCampaignSelect: (campaign: { id: string; name: string }) => void
  onAtSelect: (item: AtMentionItem, sourceCampaignId?: string) => void
  onToggleArtifactCollapsed: (typeKey: string) => void
  onShowAllArtifacts: (typeKey: string) => void
  onToggleMediaCollapsed: (typeKey: string) => void
  onShowAllMedia: (typeKey: string) => void
  slashMenuOpen: boolean
  slashVisibleItems: readonly SlashItem[]
  slashHighlight: number
  onCloseSlashMenu: () => void
  onSlashHighlightChange: (updater: HighlightUpdater) => void
  onSlashSelect: (item: SlashItem) => void
}

export function handleChatInputMenuKeyDown({
  event,
  atMenuOpen,
  atNavCount,
  atHighlight,
  atMenuTab,
  crossCampaignMode,
  atNavSlice,
  artifactRows,
  mediaRows,
  onCloseAtMenu,
  onExitCrossCampaign,
  onAtHighlightChange,
  onCampaignSelect,
  onAtSelect,
  onToggleArtifactCollapsed,
  onShowAllArtifacts,
  onToggleMediaCollapsed,
  onShowAllMedia,
  slashMenuOpen,
  slashVisibleItems,
  slashHighlight,
  onCloseSlashMenu,
  onSlashHighlightChange,
  onSlashSelect,
}: HandleChatInputMenuKeyDownOptions): boolean {
  if (atMenuOpen) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (crossCampaignMode) {
        onExitCrossCampaign()
      } else {
        onCloseAtMenu()
      }
      return true
    }
    if (atNavCount > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        onAtHighlightChange((index) =>
          atNavCount === 0 ? index : index < 0 ? 0 : (index + 1) % atNavCount,
        )
        return true
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        onAtHighlightChange((index) =>
          atNavCount === 0
            ? index
            : index < 0
              ? atNavCount - 1
              : (index - 1 + atNavCount) % atNavCount,
        )
        return true
      }
      if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
        event.preventDefault()
        selectAtHighlightedRow({
          atHighlight,
          atMenuTab,
          crossCampaignMode,
          atNavSlice,
          artifactRows,
          mediaRows,
          onCampaignSelect,
          onAtSelect,
          onToggleArtifactCollapsed,
          onShowAllArtifacts,
          onToggleMediaCollapsed,
          onShowAllMedia,
        })
        return true
      }
    }
  }

  if (slashMenuOpen) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCloseSlashMenu()
      return true
    }
    if (slashVisibleItems.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        onSlashHighlightChange((index) => (index + 1) % slashVisibleItems.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        onSlashHighlightChange(
          (index) => (index - 1 + slashVisibleItems.length) % slashVisibleItems.length,
        )
        return true
      }
      if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
        event.preventDefault()
        onSlashSelect(slashVisibleItems[slashHighlight]!)
        return true
      }
    }
  }

  return false
}

function selectAtHighlightedRow({
  atHighlight,
  atMenuTab,
  crossCampaignMode,
  atNavSlice,
  artifactRows,
  mediaRows,
  onCampaignSelect,
  onAtSelect,
  onToggleArtifactCollapsed,
  onShowAllArtifacts,
  onToggleMediaCollapsed,
  onShowAllMedia,
}: {
  atHighlight: number
  atMenuTab: StudioAtMenuTabId
  crossCampaignMode: boolean
  atNavSlice: ChatInputMenuAtNavSlice
  artifactRows: readonly StudioArtifactNavRow[]
  mediaRows: readonly StudioMediaNavRow[]
  onCampaignSelect: (campaign: { id: string; name: string }) => void
  onAtSelect: (item: AtMentionItem, sourceCampaignId?: string) => void
  onToggleArtifactCollapsed: (typeKey: string) => void
  onShowAllArtifacts: (typeKey: string) => void
  onToggleMediaCollapsed: (typeKey: string) => void
  onShowAllMedia: (typeKey: string) => void
}) {
  if (atHighlight < 0) return
  if (atNavSlice.kind === 'campaigns') {
    const row = atNavSlice.items[atHighlight]
    if (row) onCampaignSelect(row)
    return
  }
  const sourceCampaignId = crossCampaignMode ? atNavSlice.crossCampaignId : undefined
  if (atMenuTab === 'artifacts') {
    const nav = artifactRows[atHighlight]
    if (!nav) return
    if (nav.kind === 'header') {
      onToggleArtifactCollapsed(nav.typeKey)
      return
    }
    if (nav.kind === 'artifact-more') {
      onShowAllArtifacts(nav.typeKey)
      return
    }
    onAtSelect(nav.item, sourceCampaignId)
    return
  }
  if (atMenuTab === 'media') {
    const nav = mediaRows[atHighlight]
    if (!nav) return
    if (nav.kind === 'header') {
      onToggleMediaCollapsed(nav.typeKey)
      return
    }
    if (nav.kind === 'media-more') {
      onShowAllMedia(nav.typeKey)
      return
    }
    onAtSelect(nav.item, sourceCampaignId)
    return
  }
  const item = atNavSlice.items[atHighlight]
  if (item) {
    onAtSelect(item, sourceCampaignId)
  }
}
