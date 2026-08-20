import { useEffect } from 'react'
import { emitMissionDetailFocus } from '@/lib/missions'

/** Announces the open mission to chat panels while the detail panel is mounted. */
export function useMissionDetailFocus(missionId: string, title: string, status: string): void {
  useEffect(() => {
    emitMissionDetailFocus({ id: missionId, title, status })
  }, [missionId, title, status])
  useEffect(() => () => emitMissionDetailFocus(null), [])
}
