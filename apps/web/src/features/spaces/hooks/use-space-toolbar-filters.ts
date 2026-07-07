import { useCallback } from 'react'
import type { ViewDef } from '../types/space-schema'

export function useSpaceToolbarFilters(
  activeView: ViewDef | null,
  handleViewPatch: (p: Partial<ViewDef>) => void,
) {
  const toggleToolbarAssignedToMe = useCallback(() => {
    if (!activeView) return
    const cur =
      activeView.type === 'missions'
        ? !!activeView.missions_config?.toolbar_assigned_to_me
        : !!activeView.toolbar_assigned_to_me
    const next = !cur
    if (activeView.type === 'missions') {
      const mc = activeView.missions_config ?? {}
      void handleViewPatch({
        missions_config: {
          ...mc,
          toolbar_assigned_to_me: next,
          ...(next ? { toolbar_filter_agent_keys: [] } : {}),
        },
      })
    } else {
      void handleViewPatch({
        toolbar_assigned_to_me: next,
        ...(next ? { toolbar_filter_assignee_participant_ids: [] } : {}),
      })
    }
  }, [activeView, handleViewPatch])

  const toggleToolbarAssigneeParticipant = useCallback(
    (participantId: string, checked: boolean) => {
      if (!activeView || activeView.type === 'missions') return
      const cur = activeView.toolbar_filter_assignee_participant_ids ?? []
      const next = checked
        ? cur.includes(participantId)
          ? cur
          : [...cur, participantId]
        : cur.filter((id) => id !== participantId)
      void handleViewPatch({
        toolbar_assigned_to_me: false,
        toolbar_filter_assignee_participant_ids: next.length ? next : undefined,
      })
    },
    [activeView, handleViewPatch],
  )

  const toggleToolbarMissionAgent = useCallback(
    (agentKey: string, checked: boolean) => {
      if (!activeView || activeView.type !== 'missions') return
      const mc = activeView.missions_config ?? {}
      const cur = mc.toolbar_filter_agent_keys ?? []
      const next = checked
        ? cur.includes(agentKey)
          ? cur
          : [...cur, agentKey]
        : cur.filter((k) => k !== agentKey)
      void handleViewPatch({
        missions_config: {
          ...mc,
          toolbar_assigned_to_me: false,
          toolbar_filter_agent_keys: next.length ? next : undefined,
        },
      })
    },
    [activeView, handleViewPatch],
  )

  const toggleToolbarShowCompleted = useCallback(() => {
    if (!activeView) return
    if (activeView.type === 'missions') {
      const mc = activeView.missions_config ?? {}
      const cur = mc.show_closed === true
      void handleViewPatch({ missions_config: { ...mc, show_closed: !cur } })
    } else {
      const cur = activeView.show_closed_tasks === true
      void handleViewPatch({ show_closed_tasks: !cur })
    }
  }, [activeView, handleViewPatch])

  const clearToolbarAssigneeFilter = useCallback(() => {
    if (!activeView) return
    if (activeView.type === 'missions') {
      const mc = activeView.missions_config ?? {}
      void handleViewPatch({ missions_config: { ...mc, toolbar_filter_agent_keys: undefined } })
    } else {
      void handleViewPatch({ toolbar_filter_assignee_participant_ids: undefined })
    }
  }, [activeView, handleViewPatch])

  return {
    toggleToolbarAssignedToMe,
    toggleToolbarAssigneeParticipant,
    toggleToolbarMissionAgent,
    toggleToolbarShowCompleted,
    clearToolbarAssigneeFilter,
  }
}
