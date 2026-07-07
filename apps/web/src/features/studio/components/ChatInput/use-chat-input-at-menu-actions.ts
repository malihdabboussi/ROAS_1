import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { StudioAtMenuTabId } from './chat-input-at-mentions'

interface UseChatInputAtMenuActionsOptions {
  setCrossCampaignMode: Dispatch<SetStateAction<boolean>>
  setCrossCampaignId: Dispatch<SetStateAction<string | null>>
  setAtMenuTab: Dispatch<SetStateAction<StudioAtMenuTabId>>
  setAtHighlight: Dispatch<SetStateAction<number>>
  setAtArtifactCollapsedByType: Dispatch<SetStateAction<Record<string, boolean>>>
  setAtArtifactMoreByType: Dispatch<SetStateAction<Record<string, boolean>>>
  setAtMediaCollapsedByType: Dispatch<SetStateAction<Record<string, boolean>>>
  setAtMediaMoreByType: Dispatch<SetStateAction<Record<string, boolean>>>
}

export function useChatInputAtMenuActions({
  setCrossCampaignMode,
  setCrossCampaignId,
  setAtMenuTab,
  setAtHighlight,
  setAtArtifactCollapsedByType,
  setAtArtifactMoreByType,
  setAtMediaCollapsedByType,
  setAtMediaMoreByType,
}: UseChatInputAtMenuActionsOptions) {
  const handleBackFromCrossCampaign = useCallback(() => {
    setCrossCampaignMode(false)
    setCrossCampaignId(null)
  }, [setCrossCampaignId, setCrossCampaignMode])

  const handleAtMenuTabChange = useCallback(
    (id: StudioAtMenuTabId) => {
      setAtMenuTab(id)
      setAtHighlight(-1)
    },
    [setAtHighlight, setAtMenuTab],
  )

  const handleToggleArtifactCollapsed = useCallback(
    (typeKey: string) =>
      setAtArtifactCollapsedByType((prev) => ({
        ...prev,
        [typeKey]: !(prev[typeKey] === true),
      })),
    [setAtArtifactCollapsedByType],
  )

  const handleShowAllArtifacts = useCallback(
    (typeKey: string) => setAtArtifactMoreByType((prev) => ({ ...prev, [typeKey]: true })),
    [setAtArtifactMoreByType],
  )

  const handleToggleMediaCollapsed = useCallback(
    (typeKey: string) =>
      setAtMediaCollapsedByType((prev) => ({
        ...prev,
        [typeKey]: !(prev[typeKey] === true),
      })),
    [setAtMediaCollapsedByType],
  )

  const handleShowAllMedia = useCallback(
    (typeKey: string) => setAtMediaMoreByType((prev) => ({ ...prev, [typeKey]: true })),
    [setAtMediaMoreByType],
  )

  return {
    handleBackFromCrossCampaign,
    handleAtMenuTabChange,
    handleToggleArtifactCollapsed,
    handleShowAllArtifacts,
    handleToggleMediaCollapsed,
    handleShowAllMedia,
  }
}
