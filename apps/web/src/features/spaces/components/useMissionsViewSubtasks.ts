import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSubtasks, type Mission, type MissionSubtask } from '@/lib/missions'
import type { SubtasksDisplayMode } from '../types/space-schema'

interface UseMissionsViewSubtasksParams {
  sortedMissions: Mission[]
  missionsSubtasksMode: SubtasksDisplayMode
}

export function useMissionsViewSubtasks({
  sortedMissions,
  missionsSubtasksMode,
}: UseMissionsViewSubtasksParams) {
  const [subtasksByMissionId, setSubtasksByMissionId] = useState<Record<string, MissionSubtask[]>>(
    {},
  )
  const [expandedSubtaskMissions, setExpandedSubtaskMissions] = useState<Set<string>>(
    () => new Set(),
  )
  const subtasksCacheRef = useRef<Record<string, MissionSubtask[]>>({})
  const subtaskFetchInflight = useRef<Set<string>>(new Set())
  subtasksCacheRef.current = subtasksByMissionId

  const missionsWithSubtasksKey = sortedMissions
    .filter((mission) => (mission.subtask_total ?? 0) > 0)
    .map((mission) => mission.id)
    .sort()
    .join(',')

  useEffect(() => {
    if (missionsSubtasksMode === 'collapsed' || missionsSubtasksMode === 'separate') {
      setExpandedSubtaskMissions(new Set())
      return
    }
    if (!missionsWithSubtasksKey) return
    const ids = missionsWithSubtasksKey.split(',').filter(Boolean)
    if (ids.length === 0) return
    setExpandedSubtaskMissions((prev) => {
      const missing = ids.filter((id) => !prev.has(id))
      if (missing.length === 0) return prev
      const next = new Set(prev)
      for (const id of missing) next.add(id)
      return next
    })
  }, [missionsSubtasksMode, missionsWithSubtasksKey])

  const ensureSubtasksLoaded = useCallback(
    async (missionId: string) => {
      const mission = sortedMissions.find((item) => item.id === missionId)
      const total = mission?.subtask_total ?? 0
      if (total === 0) return
      const existing = subtasksCacheRef.current[missionId]
      if (existing !== undefined && existing.length === total) return
      if (subtaskFetchInflight.current.has(missionId)) return
      subtaskFetchInflight.current.add(missionId)
      try {
        const list = await fetchSubtasks(missionId)
        setSubtasksByMissionId((prev) => {
          const cur = prev[missionId]
          if (cur !== undefined && cur.length === total) return prev
          return { ...prev, [missionId]: list }
        })
      } finally {
        subtaskFetchInflight.current.delete(missionId)
      }
    },
    [sortedMissions],
  )

  const toggleSubtaskExpand = useCallback(
    (missionId: string) => {
      let opened = false
      setExpandedSubtaskMissions((prev) => {
        const next = new Set(prev)
        if (next.has(missionId)) {
          next.delete(missionId)
          return next
        }
        opened = true
        next.add(missionId)
        return next
      })
      if (opened) queueMicrotask(() => void ensureSubtasksLoaded(missionId))
    },
    [ensureSubtasksLoaded],
  )

  useEffect(() => {
    const candidateIds = sortedMissions
      .filter((mission) => (mission.subtask_total ?? 0) > 0)
      .map((mission) => mission.id)
    const toFetch = candidateIds.filter(
      (id) => !subtasksCacheRef.current[id] && !subtaskFetchInflight.current.has(id),
    )
    if (toFetch.length === 0) return

    void Promise.all(
      toFetch.map(async (missionId) => {
        subtaskFetchInflight.current.add(missionId)
        try {
          const list = await fetchSubtasks(missionId)
          setSubtasksByMissionId((prev) => {
            if (prev[missionId] !== undefined) return prev
            return { ...prev, [missionId]: list }
          })
        } finally {
          subtaskFetchInflight.current.delete(missionId)
        }
      }),
    )
  }, [sortedMissions])

  return {
    subtasksByMissionId,
    setSubtasksByMissionId,
    expandedSubtaskMissions,
    subtasksCacheRef,
    toggleSubtaskExpand,
  }
}
