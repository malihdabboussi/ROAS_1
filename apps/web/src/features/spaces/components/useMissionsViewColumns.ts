import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { MissionColumnId, MissionsConfig, ViewDef } from '../types/space-schema'

const DEFAULT_VISIBLE_COLUMNS: MissionColumnId[] = [
  'title',
  'assigned',
  'working',
  'status',
  'progress',
  'updated',
]

interface UseMissionsViewColumnsParams {
  activeView: ViewDef
  mc: MissionsConfig
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
}

export function useMissionsViewColumns({
  activeView,
  mc,
  onViewPatch,
}: UseMissionsViewColumnsParams) {
  const visibleColumns = mc.visible_columns ?? DEFAULT_VISIBLE_COLUMNS
  const [missionListColWidths, setMissionListColWidths] = useState<Record<string, number>>({})
  const missionListColWidthsRef = useRef<Record<string, number>>({})
  const persistedMissionListWidthsKey = useMemo(
    () => JSON.stringify(mc.list_column_widths ?? {}),
    [mc.list_column_widths],
  )

  useEffect(() => {
    const persistedWidths = mc.list_column_widths ?? {}
    missionListColWidthsRef.current = persistedWidths
    setMissionListColWidths(persistedWidths)
  }, [activeView.id, persistedMissionListWidthsKey, mc.list_column_widths])

  const handleReorderMissionColumns = useCallback(
    async (next: MissionColumnId[]) => {
      await onViewPatch({
        missions_config: {
          ...(activeView.missions_config ?? {}),
          visible_columns: next,
        },
      })
      toast.success('View saved')
    },
    [onViewPatch, activeView.missions_config],
  )

  const handleMissionsProgressPatch = useCallback(
    async (patch: Pick<MissionsConfig, 'progress_show_number' | 'progress_bar_fill'>) => {
      await onViewPatch({
        missions_config: {
          ...(activeView.missions_config ?? {}),
          ...patch,
        },
      })
      toast.success('View saved')
    },
    [onViewPatch, activeView.missions_config],
  )

  const missionsProgressDisplay = useMemo(
    () => ({
      showNumber: mc.progress_show_number !== false,
      barFill: mc.progress_bar_fill ?? null,
    }),
    [mc.progress_show_number, mc.progress_bar_fill],
  )

  const handleMissionListColumnResize = useCallback((colId: MissionColumnId, width: number) => {
    const next = { ...missionListColWidthsRef.current, [colId]: width }
    missionListColWidthsRef.current = next
    setMissionListColWidths(next)
  }, [])

  const handleMissionListColumnResizeEnd = useCallback(
    (colId: MissionColumnId, width: number) => {
      const next = { ...missionListColWidthsRef.current, [colId]: width }
      missionListColWidthsRef.current = next
      setMissionListColWidths(next)
      void onViewPatch({
        missions_config: {
          ...(activeView.missions_config ?? {}),
          list_column_widths: next,
        },
      })
    },
    [onViewPatch, activeView.missions_config],
  )

  return {
    visibleColumns,
    missionListColWidths,
    missionsProgressDisplay,
    handleMissionListColumnResize,
    handleMissionListColumnResizeEnd,
    handleReorderMissionColumns,
    handleMissionsProgressPatch,
  }
}
