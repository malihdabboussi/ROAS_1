import type { ReactNode } from 'react'
import type { Mission, MissionLog, PrdContent, RecommendedHire } from '../../types'

export interface MissionDetailModalProps {
  mission: Mission
  onClose: () => void
  onUpdated: () => void
  elevatedStacking?: boolean
  initialSubtaskId?: string | null
  presentation?: 'modal' | 'panel'
  headerActions?: ReactNode
}

export function getMissionDetailDisplayData(prdContent: PrdContent | null, logs: MissionLog[]) {
  const recommendedHires = ((prdContent as { recommended_hires?: RecommendedHire[] } | null)
    ?.recommended_hires ?? []) as RecommendedHire[]
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  return { recommendedHires, sortedLogs }
}
