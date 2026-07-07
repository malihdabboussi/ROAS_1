'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { MISSION_CONTROL_TOAST_ERRORS } from '../../config/mission-control-toast-errors.config'
import { retryMission, updateMission, updateMissionStatus } from '../../services/missions.service'
import type { Mission, MissionStatus } from '../../types'
import { MISSION_DETAIL_ERRORS } from '../../types'
import { openInNewTab as openAppInNewTab } from '@/lib/utils/open-in-new-tab'

export interface UseMissionMenuActionsArgs {
  mission: Mission
  onChanged?: () => void
  onOpenMission?: () => void
  onDelete?: () => void
}

function buildMissionUrl(missionId: string): string {
  if (typeof window === 'undefined') {
    return `/mission-control?mission=${encodeURIComponent(missionId)}`
  }
  return `${window.location.origin}/mission-control?mission=${encodeURIComponent(missionId)}`
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    /* fallthrough */
  }
  return false
}

export function missionCanRetry(status: MissionStatus): boolean {
  return (
    status === 'blocked' ||
    status === 'archived' ||
    status === 'inbox' ||
    status === 'error' ||
    status === 'failed' ||
    status === 'dead_letter'
  )
}

export function useMissionMenuActions({
  mission,
  onChanged,
  onOpenMission,
  onDelete,
}: UseMissionMenuActionsArgs) {
  const isArchived = mission.status === 'archived'
  const showRetry = missionCanRetry(mission.status)

  const copyLink = useCallback(async () => {
    const ok = await copyToClipboard(buildMissionUrl(mission.id))
    if (ok) toast.success('Mission link copied')
    else toast.error('Could not copy link')
  }, [mission.id])

  const copyId = useCallback(async () => {
    const ok = await copyToClipboard(mission.id)
    if (ok) toast.success('Mission ID copied')
    else toast.error('Could not copy ID')
  }, [mission.id])

  const openInNewTab = useCallback(() => {
    if (typeof window === 'undefined') return
    openAppInNewTab(buildMissionUrl(mission.id))
  }, [mission.id])

  const openMission = useCallback(() => {
    onOpenMission?.()
  }, [onOpenMission])

  const archive = useCallback(async () => {
    try {
      const newStatus: MissionStatus = isArchived ? 'backlog' : 'archived'
      await updateMissionStatus(mission.id, { status: newStatus })
      toast.success(isArchived ? 'Mission unarchived' : 'Mission archived')
      onChanged?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : MISSION_DETAIL_ERRORS.UPDATE_FAILED.userMessage
      toast.error(msg)
    }
  }, [mission.id, isArchived, onChanged])

  const retry = useCallback(async () => {
    try {
      await retryMission(mission.id)
      toast.success('Mission retry queued')
      onChanged?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : MISSION_CONTROL_TOAST_ERRORS.RETRY_FAILED.userMessage
      toast.error(msg)
    }
  }, [mission.id, onChanged])

  const rename = useCallback(async () => {
    const next = window.prompt('Rename mission', mission.title)?.trim()
    if (!next || next === mission.title) return
    try {
      await updateMission(mission.id, { title: next })
      toast.success('Mission renamed')
      onChanged?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : MISSION_DETAIL_ERRORS.UPDATE_FAILED.userMessage
      toast.error(msg)
    }
  }, [mission.id, mission.title, onChanged])

  const deleteMission = useCallback(() => {
    onDelete?.()
  }, [onDelete])

  return {
    isArchived,
    showRetry,
    copyLink,
    copyId,
    openInNewTab,
    openMission,
    archive,
    retry,
    rename,
    deleteMission,
  }
}
