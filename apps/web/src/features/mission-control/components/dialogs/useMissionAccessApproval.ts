import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  approveMissionAccessRequests,
  denyMissionAccessRequests,
} from '../../services/missions.service'
import type { MissionAccessRequest, MissionSubtask } from '../../types'

interface Options {
  missionId: string
  requests: MissionAccessRequest[]
  setRequests: Dispatch<SetStateAction<MissionAccessRequest[]>>
  setSubtasks: Dispatch<SetStateAction<MissionSubtask[]>>
  onUpdated: () => void
}
export function useMissionAccessApproval(o: Options) {
  const [approvingAccess, setApprovingAccess] = useState(false)
  const [denyingAccess, setDenyingAccess] = useState(false)
  const handleApproveAccess = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return
      setApprovingAccess(true)
      try {
        await approveMissionAccessRequests(o.missionId, ids)
        o.setRequests((p) =>
          p.map((r) =>
            ids.includes(r.id)
              ? { ...r, status: 'approved', approved_at: new Date().toISOString() }
              : r,
          ),
        )
        toast.success('Access approved')
        o.onUpdated()
      } catch (e) {
        toast.error(sanitizeUserError(e, 'Failed to approve access'))
      } finally {
        setApprovingAccess(false)
      }
    },
    [o],
  )
  const handleDenyAccess = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return
      setDenyingAccess(true)
      try {
        await denyMissionAccessRequests(o.missionId, ids)
        o.setRequests((p) => p.map((r) => (ids.includes(r.id) ? { ...r, status: 'denied' } : r)))
        o.setSubtasks((p) =>
          p.map((t) =>
            o.requests.some((r) => ids.includes(r.id) && r.subtask_id === t.id)
              ? { ...t, status: 'blocked' }
              : t,
          ),
        )
        toast.success('Access denied. This step will stay paused.')
        o.onUpdated()
      } catch (e) {
        toast.error(sanitizeUserError(e, 'Failed to deny access'))
      } finally {
        setDenyingAccess(false)
      }
    },
    [o],
  )
  return { approvingAccess, denyingAccess, handleApproveAccess, handleDenyAccess }
}
