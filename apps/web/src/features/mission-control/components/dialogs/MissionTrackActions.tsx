'use client'

import { useState } from 'react'
import { listMissionTrackActions, type MissionTrackActionId } from '@/lib/missions'
import { MISSION_CONTROL_MESSAGES } from '../../config/messages.config'
import type { Mission, MissionSubtask } from '../../types'

interface MissionTrackActionsProps {
  mission: Mission
  subtasks: MissionSubtask[]
  onExtend: (action: MissionTrackActionId) => Promise<void>
}

export function MissionTrackActions({ mission, subtasks, onExtend }: MissionTrackActionsProps) {
  const actions = listMissionTrackActions(mission, subtasks)
  const [busyAction, setBusyAction] = useState<MissionTrackActionId | null>(null)
  if (actions.length === 0) return null

  return (
    <div className="border-t-glass pt-spacing-3 mt-spacing-3">
      <h3 className="body-2 text-foreground font-semibold">
        {MISSION_CONTROL_MESSAGES.TRACK_HEADING}
      </h3>
      <p className="body-4 text-muted-foreground mt-spacing-1">
        {MISSION_CONTROL_MESSAGES.TRACK_BODY}
      </p>
      <div className="gap-spacing-2 mt-spacing-2 flex flex-wrap">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={busyAction !== null}
            onClick={() => {
              void (async () => {
                setBusyAction(action.id)
                try {
                  await onExtend(action.id)
                } finally {
                  setBusyAction(null)
                }
              })()
            }}
            className="button-glass-primary button-default disabled:opacity-50"
          >
            {busyAction === action.id ? MISSION_CONTROL_MESSAGES.TRACK_QUEUING : action.title}
          </button>
        ))}
      </div>
    </div>
  )
}
