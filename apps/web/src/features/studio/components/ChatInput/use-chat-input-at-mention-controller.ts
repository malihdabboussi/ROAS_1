import { useCallback, useMemo, useState, type RefObject } from 'react'
import type { AtMentionItem } from './chat-input-at-mentions'
import { useChatInputAtMenuActions } from './use-chat-input-at-menu-actions'
import { useChatInputAtMentionData } from './use-chat-input-at-mention-data'
import { useChatInputAtMentionLayout } from './use-chat-input-at-mention-layout'

export interface ChatInputSpaceComposerSpaceTask {
  id: string
  label: string
  statusLabel: string
  statusDotColor?: string
}

interface UseChatInputAtMentionControllerOptions {
  campaignId?: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  spaceComposerSpaceTasks?: readonly ChatInputSpaceComposerSpaceTask[]
}

export function useChatInputAtMentionController({
  campaignId,
  textareaRef,
  spaceComposerSpaceTasks,
}: UseChatInputAtMentionControllerOptions) {
  const [atHighlight, setAtHighlight] = useState(-1)
  const spaceComposerSpaceTaskMentions = useMemo<AtMentionItem[]>(
    () =>
      (spaceComposerSpaceTasks ?? []).map((task) => ({
        id: task.id,
        label: task.label,
        section: 'space-task' as const,
        type: task.statusLabel,
        spaceTaskStatusColor: task.statusDotColor,
      })),
    [spaceComposerSpaceTasks],
  )
  const resetAtHighlight = useCallback(() => setAtHighlight(-1), [])

  const {
    atMenuOpen,
    setAtMenuOpen,
    atItems,
    setAtItems,
    atQuery,
    setAtQuery,
    atDataLoading,
    otherCampaigns,
    crossCampaignMode,
    setCrossCampaignMode,
    crossCampaignId,
    setCrossCampaignId,
    crossCampaignLoading,
    syncAtMenuFromComposer,
  } = useChatInputAtMentionData({
    campaignId,
    textareaRef,
    spaceTaskMentions: spaceComposerSpaceTaskMentions,
    onActiveTokenSync: resetAtHighlight,
  })

  const {
    atMenuTab,
    setAtMenuTab,
    atMenuLayout,
    studioAtTabsForMenu,
    atComposerNavSlice,
    atArtifactNavRows,
    atMediaNavRows,
    atNavCount,
    setAtArtifactCollapsedByType,
    setAtArtifactMoreByType,
    setAtMediaCollapsedByType,
    setAtMediaMoreByType,
    setAtMissionsExpanded,
    setAtSpaceTasksExpanded,
  } = useChatInputAtMentionLayout({
    atItems,
    atQuery,
    atMenuOpen,
    otherCampaigns,
    crossCampaignMode,
    crossCampaignId,
    spaceTaskMentions: spaceComposerSpaceTaskMentions,
    atHighlight,
    setAtHighlight,
  })

  const {
    handleBackFromCrossCampaign,
    handleAtMenuTabChange,
    handleToggleArtifactCollapsed,
    handleShowAllArtifacts,
    handleToggleMediaCollapsed,
    handleShowAllMedia,
  } = useChatInputAtMenuActions({
    setCrossCampaignMode,
    setCrossCampaignId,
    setAtMenuTab,
    setAtHighlight,
    setAtArtifactCollapsedByType,
    setAtArtifactMoreByType,
    setAtMediaCollapsedByType,
    setAtMediaMoreByType,
  })

  return {
    atHighlight,
    setAtHighlight,
    atMenuOpen,
    setAtMenuOpen,
    atItems,
    setAtItems,
    atQuery,
    setAtQuery,
    atDataLoading,
    crossCampaignMode,
    setCrossCampaignMode,
    crossCampaignId,
    setCrossCampaignId,
    crossCampaignLoading,
    syncAtMenuFromComposer,
    atMenuTab,
    setAtMenuTab,
    atMenuLayout,
    studioAtTabsForMenu,
    atComposerNavSlice,
    atArtifactNavRows,
    atMediaNavRows,
    atNavCount,
    setAtArtifactCollapsedByType,
    setAtArtifactMoreByType,
    setAtMediaCollapsedByType,
    setAtMediaMoreByType,
    setAtMissionsExpanded,
    setAtSpaceTasksExpanded,
    handleBackFromCrossCampaign,
    handleAtMenuTabChange,
    handleToggleArtifactCollapsed,
    handleShowAllArtifacts,
    handleToggleMediaCollapsed,
    handleShowAllMedia,
  }
}
