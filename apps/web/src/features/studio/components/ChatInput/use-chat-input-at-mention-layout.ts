import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { AT_SECTION_PREVIEW } from './chat-input-constants'
import {
  buildStudioArtifactNavRows,
  buildStudioMediaNavRows,
  groupStudioArtifactItems,
  groupStudioMediaItems,
  type AtMentionItem,
  type StudioAtMenuTabId,
} from './chat-input-at-mentions'

export interface UseChatInputAtMentionLayoutOptions {
  atItems: AtMentionItem[]
  atQuery: string
  atMenuOpen: boolean
  otherCampaigns: Array<{ id: string; name: string }>
  crossCampaignMode: boolean
  crossCampaignId: string | null
  spaceTaskMentions: AtMentionItem[]
  atHighlight: number
  setAtHighlight: Dispatch<SetStateAction<number>>
}

export function useChatInputAtMentionLayout({
  atItems,
  atQuery,
  atMenuOpen,
  otherCampaigns,
  crossCampaignMode,
  crossCampaignId,
  spaceTaskMentions,
  setAtHighlight,
}: UseChatInputAtMentionLayoutOptions) {
  const [atMenuTab, setAtMenuTab] = useState<StudioAtMenuTabId>('artifacts')
  const [atArtifactCollapsedByType, setAtArtifactCollapsedByType] = useState<
    Record<string, boolean>
  >({})
  const [atArtifactMoreByType, setAtArtifactMoreByType] = useState<Record<string, boolean>>({})
  const [atMediaCollapsedByType, setAtMediaCollapsedByType] = useState<Record<string, boolean>>({})
  const [atMediaMoreByType, setAtMediaMoreByType] = useState<Record<string, boolean>>({})
  const [atMissionsExpanded, setAtMissionsExpanded] = useState(false)
  const [atSpaceTasksExpanded, setAtSpaceTasksExpanded] = useState(false)

  const atMenuLayout = useMemo(() => {
    const spaceTaskItems = atItems.filter((i) => i.section === 'space-task')
    const artifactItems = atItems.filter((i) => i.section === 'artifact')
    const mediaItems = atItems.filter((i) => i.section === 'media')
    const missionItems = atItems.filter((i) => i.section === 'mission')
    const spaceTaskVisible = atSpaceTasksExpanded
      ? spaceTaskItems
      : spaceTaskItems.slice(0, AT_SECTION_PREVIEW)
    const missionVisible = atMissionsExpanded
      ? missionItems
      : missionItems.slice(0, AT_SECTION_PREVIEW)
    const campaignMatches = crossCampaignMode
      ? []
      : atQuery
        ? otherCampaigns.filter((c) =>
            c.name.toLowerCase().includes(atQuery.replace(/_/g, ' ').toLowerCase()),
          )
        : otherCampaigns.slice(0, 3)
    return {
      spaceTaskItems,
      artifactItems,
      mediaItems,
      missionItems,
      spaceTaskVisible,
      missionVisible,
      campaignMatches,
      showSpaceTaskMore: !atSpaceTasksExpanded && spaceTaskItems.length > AT_SECTION_PREVIEW,
      showMissionMore: !atMissionsExpanded && missionItems.length > AT_SECTION_PREVIEW,
    }
  }, [
    atItems,
    atSpaceTasksExpanded,
    atMissionsExpanded,
    otherCampaigns,
    atQuery,
    crossCampaignMode,
  ])

  const studioAtTabsForMenu = useMemo((): { id: StudioAtMenuTabId; label: string }[] => {
    if (crossCampaignMode) {
      return [
        { id: 'artifacts', label: 'Artifacts' },
        { id: 'media', label: 'Media' },
        { id: 'missions', label: 'Missions' },
      ]
    }
    const tabs: { id: StudioAtMenuTabId; label: string }[] = []
    if (spaceTaskMentions.length > 0) {
      tabs.push({ id: 'tasks', label: 'Tasks' })
    }
    tabs.push(
      { id: 'artifacts', label: 'Artifacts' },
      { id: 'media', label: 'Media' },
      { id: 'missions', label: 'Missions' },
    )
    if (otherCampaigns.length > 0) {
      tabs.push({ id: 'campaigns', label: 'Campaigns' })
    }
    return tabs
  }, [crossCampaignMode, spaceTaskMentions.length, otherCampaigns.length])

  const atComposerNavSlice = useMemo<
    | { kind: 'items'; items: AtMentionItem[]; crossCampaignId?: string }
    | { kind: 'campaigns'; items: Array<{ id: string; name: string }> }
  >(() => {
    const { spaceTaskVisible, artifactItems, mediaItems, missionVisible, campaignMatches } =
      atMenuLayout
    if (crossCampaignMode) {
      let items: AtMentionItem[] = []
      if (atMenuTab === 'artifacts') items = artifactItems
      else if (atMenuTab === 'media') items = mediaItems
      else if (atMenuTab === 'missions') items = missionVisible
      return { kind: 'items', items, crossCampaignId: crossCampaignId ?? undefined }
    }
    if (atMenuTab === 'campaigns') {
      return { kind: 'campaigns', items: campaignMatches }
    }
    let items: AtMentionItem[] = []
    if (atMenuTab === 'tasks') items = spaceTaskVisible
    else if (atMenuTab === 'artifacts') items = artifactItems
    else if (atMenuTab === 'media') items = mediaItems
    else if (atMenuTab === 'missions') items = missionVisible
    return { kind: 'items', items, crossCampaignId: undefined }
  }, [atMenuTab, atMenuLayout, crossCampaignMode, crossCampaignId])

  const atArtifactGroups = useMemo(
    () => groupStudioArtifactItems(atMenuLayout.artifactItems),
    [atMenuLayout.artifactItems],
  )

  const atArtifactNavRows = useMemo(
    () =>
      buildStudioArtifactNavRows(atArtifactGroups, atArtifactCollapsedByType, atArtifactMoreByType),
    [atArtifactGroups, atArtifactCollapsedByType, atArtifactMoreByType],
  )

  const atMediaGroups = useMemo(
    () => groupStudioMediaItems(atMenuLayout.mediaItems),
    [atMenuLayout.mediaItems],
  )

  const atMediaNavRows = useMemo(
    () => buildStudioMediaNavRows(atMediaGroups, atMediaCollapsedByType, atMediaMoreByType),
    [atMediaGroups, atMediaCollapsedByType, atMediaMoreByType],
  )

  const atNavCount = useMemo(() => {
    if (atComposerNavSlice.kind === 'campaigns') return atComposerNavSlice.items.length
    if (atMenuTab === 'artifacts') return atArtifactNavRows.length
    if (atMenuTab === 'media') return atMediaNavRows.length
    return atComposerNavSlice.items.length
  }, [
    atComposerNavSlice.kind,
    atComposerNavSlice.items.length,
    atMenuTab,
    atArtifactNavRows.length,
    atMediaNavRows.length,
  ])

  useEffect(() => {
    setAtSpaceTasksExpanded(false)
    setAtArtifactMoreByType((prev) => (Object.keys(prev).length === 0 ? prev : {}))
    setAtMediaMoreByType((prev) => (Object.keys(prev).length === 0 ? prev : {}))
    setAtMissionsExpanded(false)
  }, [atItems])

  useEffect(() => {
    if (!studioAtTabsForMenu.some((t) => t.id === atMenuTab)) {
      setAtMenuTab(studioAtTabsForMenu[0]?.id ?? 'artifacts')
    }
  }, [studioAtTabsForMenu, atMenuTab])

  const atMenuWasOpenRef = useRef(false)
  useEffect(() => {
    const nowOpen = atMenuOpen
    const wasOpen = atMenuWasOpenRef.current
    atMenuWasOpenRef.current = nowOpen
    if (nowOpen && !wasOpen && !crossCampaignMode) {
      setAtMenuTab(studioAtTabsForMenu[0]?.id ?? 'artifacts')
      setAtHighlight(-1)
    }
  }, [atMenuOpen, crossCampaignMode, studioAtTabsForMenu, setAtHighlight])

  const crossCampaignWasOpenRef = useRef(crossCampaignMode)
  useEffect(() => {
    if (atMenuOpen && crossCampaignWasOpenRef.current && !crossCampaignMode) {
      setAtMenuTab(spaceTaskMentions.length > 0 ? 'tasks' : 'artifacts')
      setAtHighlight(-1)
    }
    crossCampaignWasOpenRef.current = crossCampaignMode
  }, [crossCampaignMode, atMenuOpen, spaceTaskMentions.length, setAtHighlight])

  useEffect(() => {
    if (!atMenuOpen) return
    const n = atNavCount
    if (n === 0) {
      setAtHighlight(-1)
      return
    }
    setAtHighlight((h) => {
      if (h < 0) return h
      return Math.min(h, n - 1)
    })
  }, [
    atMenuOpen,
    atNavCount,
    atMenuTab,
    atSpaceTasksExpanded,
    atArtifactNavRows.length,
    atMediaNavRows.length,
    atMissionsExpanded,
    setAtHighlight,
  ])

  return {
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
  }
}
