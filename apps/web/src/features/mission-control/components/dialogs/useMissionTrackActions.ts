import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { extendMission, retryMissionSubtask } from '@/lib/missions'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { MISSION_CONTROL_MESSAGES } from '../../config/messages.config'

export function useMissionTrackActions(missionId: string, onUpdated: () => void) {
  const [rerunningSubtaskId, setRerunningSubtaskId] = useState<string | null>(null)

  const handleExtendTrack = useCallback(
    async (action: 'post-call-strategy') => {
      try {
        await extendMission(missionId, action)
        toast.success(MISSION_CONTROL_MESSAGES.TRACK_QUEUED)
        onUpdated()
      } catch (err) {
        toast.error(sanitizeUserError(err, MISSION_CONTROL_MESSAGES.TRACK_EXTEND_FAILED))
      }
    },
    [missionId, onUpdated],
  )

  const handleRerunSubtask = useCallback(
    async (subtaskId: string) => {
      setRerunningSubtaskId(subtaskId)
      try {
        await retryMissionSubtask(missionId, subtaskId)
        toast.success(MISSION_CONTROL_MESSAGES.RERUN_STARTED)
        onUpdated()
      } catch (err) {
        toast.error(sanitizeUserError(err, MISSION_CONTROL_MESSAGES.RERUN_FAILED))
      } finally {
        setRerunningSubtaskId(null)
      }
    },
    [missionId, onUpdated],
  )

  return { rerunningSubtaskId, handleExtendTrack, handleRerunSubtask }
}
