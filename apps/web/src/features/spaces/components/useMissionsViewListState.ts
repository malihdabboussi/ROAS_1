import type { MouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { fetchMissionAgents, type MissionAgent } from '@/lib/agents'
import {
  fetchDeliverablesForMissions,
  fetchMissionById,
  fetchMissions,
  fetchSubtasks,
  type Mission,
  type MissionDeliverable,
  type MissionSubtask,
} from '@/lib/missions'
import { groupMissions } from '../lib/group-missions'
import {
  resolveMissionsSubtasksDisplay,
  type MissionsConfig,
  type ViewDef,
} from '../types/space-schema'
import type { MissionsViewListContentProps } from './MissionsViewListContent'
import { useMissionsViewColumns } from './useMissionsViewColumns'
import { useMissionsViewRealtime } from './useMissionsViewRealtime'
import { useMissionsViewSubtasks } from './useMissionsViewSubtasks'

interface UseMissionsViewListStateParams {
  campaignId: string
  campaignName: string
  spaceId?: string | null
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onAddColumn?: (event: MouseEvent<HTMLButtonElement>) => void
  currentUserId: string | null
  toolbarSearchQuery: string
}

export function useMissionsViewListState({
  campaignId,
  campaignName,
  spaceId = null,
  activeView,
  onViewPatch,
  onAddColumn,
  currentUserId,
  toolbarSearchQuery,
}: UseMissionsViewListStateParams) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [agents, setAgents] = useState<MissionAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
  const [previewDeliverable, setPreviewDeliverable] = useState<MissionDeliverable | null>(null)
  const [collapsedMissionGroups, setCollapsedMissionGroups] = useState<Record<string, boolean>>({})
  const [deliverablesByMissionId, setDeliverablesByMissionId] = useState<
    Record<string, MissionDeliverable[]>
  >({})
  const missionsByIdRef = useRef<Map<string, Mission>>(new Map())
  const missionRefreshTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const missionsById = useMemo(
    () => new Map(missions.map((mission) => [mission.id, mission])),
    [missions],
  )
  missionsByIdRef.current = missionsById

  const mc: MissionsConfig = activeView.missions_config ?? {}
  const missionsSubtasksMode = resolveMissionsSubtasksDisplay(mc)
  const {
    visibleColumns,
    missionListColWidths,
    missionsProgressDisplay,
    handleMissionListColumnResize,
    handleMissionListColumnResizeEnd,
    handleReorderMissionColumns,
    handleMissionsProgressPatch,
  } = useMissionsViewColumns({ activeView, mc, onViewPatch })

  const sortedMissions = useMemo(() => {
    const list = [...missions]
    list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return list
  }, [missions])

  const {
    subtasksByMissionId,
    setSubtasksByMissionId,
    expandedSubtaskMissions,
    subtasksCacheRef,
    toggleSubtaskExpand,
  } = useMissionsViewSubtasks({ sortedMissions, missionsSubtasksMode })

  const campaignListItem = useMemo(
    () => [{ id: campaignId, name: campaignName }],
    [campaignId, campaignName],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [m, a] = await Promise.all([
        fetchMissions({
          campaign_id: campaignId,
          ...(spaceId ? { space_id: spaceId } : {}),
        }),
        fetchMissionAgents(),
      ])
      setSubtasksByMissionId((prev) => {
        const next: Record<string, MissionSubtask[]> = {}
        for (const mission of m) {
          const total = mission.subtask_total ?? 0
          if (total === 0) continue
          const cached = prev[mission.id]
          if (cached && cached.length === total) next[mission.id] = cached
        }
        return next
      })
      setMissions(m)
      setAgents(a)
    } catch {
      toast.error('Failed to load missions')
    } finally {
      setLoading(false)
    }
  }, [campaignId, spaceId])

  const upsertRealtimeMission = useCallback((mission: Mission) => {
    setMissions((prev) => {
      const index = prev.findIndex((item) => item.id === mission.id)
      if (index === -1) return [...prev, mission]
      const next = [...prev]
      next[index] = mission
      return next
    })
    setSelectedMission((prev) => (prev?.id === mission.id ? mission : prev))
  }, [])

  const removeRealtimeMission = useCallback((missionId: string) => {
    setMissions((prev) => prev.filter((mission) => mission.id !== missionId))
    setSelectedMission((prev) => (prev?.id === missionId ? null : prev))
    setSubtasksByMissionId((prev) => {
      if (!prev[missionId]) return prev
      const next = { ...prev }
      delete next[missionId]
      return next
    })
  }, [])

  const refreshMissionFromSubtaskChange = useCallback(
    (missionId: string) => {
      const existingTimer = missionRefreshTimersRef.current[missionId]
      if (existingTimer) clearTimeout(existingTimer)

      missionRefreshTimersRef.current[missionId] = setTimeout(() => {
        delete missionRefreshTimersRef.current[missionId]
        if (!missionsByIdRef.current.has(missionId)) return

        void (async () => {
          const shouldRefreshSubtasks = Boolean(subtasksCacheRef.current[missionId])
          const [mission, subtasks] = await Promise.all([
            fetchMissionById(missionId).catch(() => null),
            shouldRefreshSubtasks
              ? fetchSubtasks(missionId).catch(() => null)
              : Promise.resolve(null),
          ])

          if (mission?.campaign_id === campaignId && (!spaceId || mission.space_id === spaceId)) {
            upsertRealtimeMission(mission)
          } else if (mission && spaceId && mission.space_id !== spaceId) {
            removeRealtimeMission(missionId)
          }
          if (subtasks && missionsByIdRef.current.has(missionId)) {
            setSubtasksByMissionId((prev) => ({ ...prev, [missionId]: subtasks }))
          }
        })()
      }, 150)
    },
    [campaignId, removeRealtimeMission, spaceId, upsertRealtimeMission],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  useMissionsViewRealtime({
    campaignId,
    spaceId,
    subtasksCacheRef,
    missionsByIdRef,
    missionRefreshTimersRef,
    upsertRealtimeMission,
    removeRealtimeMission,
    refreshMissionFromSubtaskChange,
  })

  const missionsForDisplay = useMemo(() => {
    let list = sortedMissions
    const tmc = activeView.missions_config ?? {}
    if (tmc.toolbar_assigned_to_me && currentUserId) {
      list = list.filter((m) => m.user_id === currentUserId)
    }
    if ((tmc.toolbar_filter_agent_keys?.length ?? 0) > 0) {
      const keys = new Set(tmc.toolbar_filter_agent_keys)
      list = list.filter((m) => m.assigned_agent_key != null && keys.has(m.assigned_agent_key))
    }
    const q = toolbarSearchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.brief?.toLowerCase().includes(q) ?? false) ||
          (m.description?.toLowerCase().includes(q) ?? false),
      )
    }
    return list
  }, [sortedMissions, activeView.missions_config, currentUserId, toolbarSearchQuery])

  const needDeliverableCols = visibleColumns.some(
    (column) => column === 'documents' || column === 'media' || column === 'artifacts',
  )
  const missionIdsKey = useMemo(() => sortedMissions.map((m) => m.id).join(','), [sortedMissions])

  useEffect(() => {
    if (!needDeliverableCols) return
    if (sortedMissions.length === 0) return
    let cancelled = false
    void fetchDeliverablesForMissions(sortedMissions.map((m) => m.id)).then((result) => {
      if (!cancelled) setDeliverablesByMissionId(result)
    })
    return () => {
      cancelled = true
    }
  }, [needDeliverableCols, missionIdsKey, sortedMissions])

  const missionGroups = useMemo(() => {
    if (!mc.group_by) return null
    return groupMissions(
      missionsForDisplay,
      mc.group_by,
      mc.group_sort ?? 'asc',
      mc.show_empty_groups ?? false,
      mc.show_closed ?? true,
      agents,
    )
  }, [missionsForDisplay, mc.group_by, mc.group_sort, mc.show_empty_groups, mc.show_closed, agents])

  const onToggleGroup = useCallback((groupKey: string) => {
    setCollapsedMissionGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }))
  }, [])
  const onSelectMission = useCallback(
    (missionId: string) => {
      const mission = missions.find((item) => item.id === missionId)
      setSelectedSubtaskId(null)
      setSelectedMission(mission ?? null)
    },
    [missions],
  )
  const onSelectSubtask = useCallback(
    (missionId: string, subtaskId: string) => {
      const mission = missions.find((item) => item.id === missionId)
      setSelectedSubtaskId(mission ? subtaskId : null)
      setSelectedMission(mission ?? null)
    },
    [missions],
  )
  const onChanged = useCallback(() => {
    void loadData()
  }, [loadData])
  const listContentProps: MissionsViewListContentProps = {
    missionsForDisplay,
    sortedMissions,
    missionGroups,
    groupBy: mc.group_by,
    collapsedMissionGroups,
    agents,
    campaigns: campaignListItem,
    selectedMissionId: selectedMission?.id ?? null,
    visibleColumns,
    onAddColumn,
    subtasksByMissionId,
    expandedSubtaskMissionIds: expandedSubtaskMissions,
    subtasksDisplayMode: missionsSubtasksMode,
    missionsProgress: missionsProgressDisplay,
    deliverablesByMissionId,
    listColumnWidths: missionListColWidths,
    onToggleGroup,
    onSelectMission,
    onSelectSubtask,
    onChanged,
    onToggleSubtaskExpand: toggleSubtaskExpand,
    onReorderColumns: handleReorderMissionColumns,
    onMissionsProgressPatch: handleMissionsProgressPatch,
    onOpenDeliverable: setPreviewDeliverable,
    onListColumnResize: handleMissionListColumnResize,
    onListColumnResizeEnd: handleMissionListColumnResizeEnd,
  }
  return {
    agents,
    loading,
    selectedMission,
    setSelectedMission,
    selectedSubtaskId,
    setSelectedSubtaskId,
    previewDeliverable,
    setPreviewDeliverable,
    loadData,
    listContentProps,
  }
}
