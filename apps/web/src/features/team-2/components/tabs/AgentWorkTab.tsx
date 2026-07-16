'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import type { MissionAgent } from '@/lib/agents'
import {
  fetchDeliverablesForMissions,
  fetchMissionById,
  type Mission,
  type MissionDeliverable,
} from '@/lib/missions'
import { TEAM_OPS_DESK_MESSAGES } from '../../config/messages.config'
import {
  activeMissionsForAgents,
  recentActivityForAgents,
} from '../../lib/agent-team-metrics'
import { resolveAgentFocusLabel } from '../../lib/ops-desk-summary'

interface AgentWorkTabProps {
  agent: MissionAgent
  missions: Mission[]
  onAssignWork: () => void
}

export function AgentWorkTab({ agent, missions, onAssignWork }: AgentWorkTabProps) {
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [deliverablesByMission, setDeliverablesByMission] = useState<
    Record<string, MissionDeliverable[]>
  >({})

  const agentKeys = useMemo(() => new Set([agent.agent_key]), [agent.agent_key])
  const focus = useMemo(() => resolveAgentFocusLabel(agent, missions), [agent, missions])
  const queue = useMemo(
    () => activeMissionsForAgents(missions, agentKeys),
    [missions, agentKeys],
  )
  const recent = useMemo(
    () => recentActivityForAgents(missions, agentKeys, 7).slice(0, 8),
    [missions, agentKeys],
  )

  useEffect(() => {
    let cancelled = false
    const ids = recent.map((m) => m.id)
    if (ids.length === 0) {
      setDeliverablesByMission({})
      return
    }
    void fetchDeliverablesForMissions(ids)
      .then((map) => {
        if (!cancelled) setDeliverablesByMission(map)
      })
      .catch(() => {
        if (!cancelled) setDeliverablesByMission({})
      })
    return () => {
      cancelled = true
    }
  }, [recent])

  const openMission = useCallback(async (missionId: string) => {
    const fromList = queue.find((m) => m.id === missionId) ?? recent.find((m) => m.id === missionId)
    if (fromList) {
      setSelectedMission(fromList)
      return
    }
    const loaded = await fetchMissionById(missionId).catch(() => null)
    if (loaded) setSelectedMission(loaded)
  }, [queue, recent])

  const nowMission =
    focus.kind === 'mission' && focus.missionId
      ? queue.find((m) => m.id === focus.missionId) ?? null
      : null

  return (
    <div className="gap-spacing-4 p-spacing-3 flex h-full min-h-0 flex-col overflow-y-auto">
      <section className="gap-spacing-2 flex flex-col">
        <h3 className="typo-section-label text-muted-foreground">Now</h3>
        {nowMission ? (
          <button
            type="button"
            onClick={() => void openMission(nowMission.id)}
            className="surface-card border-border rounded-spacing-2 p-spacing-3 hover:bg-hover-subtle text-left border transition-colors"
          >
            <p className="body-2 text-foreground font-medium">{nowMission.title}</p>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              {nowMission.status}
              {nowMission.progress_notes ? ` · ${nowMission.progress_notes}` : ''}
            </p>
          </button>
        ) : (
          <div className="gap-spacing-2 flex flex-col">
            <p className="body-3 text-muted-foreground">{TEAM_OPS_DESK_MESSAGES.IDLE_FOCUS}</p>
            <button type="button" className="button-glass-neutral w-fit" onClick={onAssignWork}>
              {TEAM_OPS_DESK_MESSAGES.ASSIGN_WORK}
            </button>
          </div>
        )}
      </section>

      <section className="gap-spacing-2 flex flex-col">
        <h3 className="typo-section-label text-muted-foreground">Queue</h3>
        {queue.length === 0 ? (
          <p className="body-3 text-muted-foreground">No open missions.</p>
        ) : (
          <ul className="gap-spacing-2 flex flex-col">
            {queue.map((mission) => (
              <li key={mission.id}>
                <button
                  type="button"
                  onClick={() => void openMission(mission.id)}
                  className="surface-card border-border rounded-spacing-2 p-spacing-3 hover:bg-hover-subtle w-full text-left border transition-colors"
                >
                  <p className="body-2 text-foreground font-medium">{mission.title}</p>
                  <p className="body-4 text-muted-foreground mt-spacing-1">{mission.status}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="gap-spacing-2 flex flex-col">
        <h3 className="typo-section-label text-muted-foreground">Recent</h3>
        {recent.length === 0 ? (
          <p className="body-3 text-muted-foreground">No completed work in the last 7 days.</p>
        ) : (
          <ul className="gap-spacing-2 flex flex-col">
            {recent.map((mission) => {
              const deliverables = deliverablesByMission[mission.id] ?? []
              return (
                <li key={mission.id}>
                  <button
                    type="button"
                    onClick={() => void openMission(mission.id)}
                    className="surface-card border-border rounded-spacing-2 p-spacing-3 hover:bg-hover-subtle w-full text-left border transition-colors"
                  >
                    <p className="body-2 text-foreground font-medium">{mission.title}</p>
                    <p className="body-4 text-muted-foreground mt-spacing-1">
                      {mission.status}
                      {deliverables.length > 0
                        ? ` · ${deliverables.length} deliverable${deliverables.length === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {selectedMission ? (
        <MissionDetailModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
          onUpdated={() => setSelectedMission(null)}
        />
      ) : null}
    </div>
  )
}
