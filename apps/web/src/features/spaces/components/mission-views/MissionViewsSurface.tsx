'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, Circle, LayoutDashboard } from 'lucide-react'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchDeliverablesForMissions,
  fetchSubtasks,
  type Mission,
  type MissionDeliverable,
  type MissionSubtask,
} from '@/lib/missions'
import { getMissionViewDefinition } from '../../lib/mission-view-registry'
import { AdsResearchRunDetailView } from '../ads-research/AdsResearchRunDetailView'
import { MissionPlaybookReportView } from './MissionPlaybookReportView'

interface MissionViewsSurfaceProps {
  missions: Mission[]
  spaceId: string
  onBackToList: () => void
  onRefresh: () => Promise<void>
}

function playbookId(mission: Mission): unknown {
  return mission.input?.playbook_id
}

function isSupported(mission: Mission): boolean {
  return (
    playbookId(mission) === 'ads-research' || Boolean(getMissionViewDefinition(playbookId(mission)))
  )
}

export function MissionViewsSurface({
  missions,
  spaceId,
  onBackToList,
  onRefresh,
}: MissionViewsSurfaceProps) {
  const supported = useMemo(() => missions.filter(isSupported), [missions])
  const [selected, setSelected] = useState<Mission | null>(null)
  const [subtasks, setSubtasks] = useState<MissionSubtask[]>([])
  const [deliverables, setDeliverables] = useState<MissionDeliverable[]>([])
  const [preview, setPreview] = useState<MissionDeliverable | null>(null)
  const [missionDetailSubtaskId, setMissionDetailSubtaskId] = useState<string | null>(null)
  const [missionDetailOpen, setMissionDetailOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selected) return
    let active = true
    setLoading(true)
    void Promise.all([fetchSubtasks(selected.id), fetchDeliverablesForMissions([selected.id])])
      .then(([nextSubtasks, byMission]) => {
        if (!active) return
        setSubtasks(nextSubtasks)
        setDeliverables(byMission[selected.id] ?? [])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [selected])

  const openMission = (subtaskId?: string) => {
    setMissionDetailSubtaskId(subtaskId ?? null)
    setMissionDetailOpen(true)
  }

  if (selected && loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <VibeyLoadingOrb text="Loading mission view…" state="processing" size="lg" />
      </div>
    )
  }

  if (selected && playbookId(selected) === 'ads-research') {
    return (
      <>
        <AdsResearchRunDetailView
          run={selected}
          deliverables={deliverables}
          spaceId={spaceId}
          onBack={() => setSelected(null)}
          onOpenMission={() => openMission()}
        />
        {missionDetailOpen ? (
          <MissionDetailModal
            mission={selected}
            initialSubtaskId={missionDetailSubtaskId}
            onClose={() => setMissionDetailOpen(false)}
            onUpdated={() => void onRefresh()}
          />
        ) : null}
      </>
    )
  }

  const definition = selected ? getMissionViewDefinition(playbookId(selected)) : undefined
  if (selected && definition) {
    return (
      <>
        <MissionPlaybookReportView
          mission={selected}
          definition={definition}
          subtasks={subtasks}
          deliverables={deliverables}
          onBack={() => setSelected(null)}
          onOpenMission={openMission}
          onOpenDeliverable={setPreview}
        />
        {missionDetailOpen ? (
          <MissionDetailModal
            mission={selected}
            initialSubtaskId={missionDetailSubtaskId}
            onClose={() => setMissionDetailOpen(false)}
            onUpdated={() => void onRefresh()}
          />
        ) : null}
        {preview ? (
          <DeliverablePreviewModal
            deliverable={preview}
            agents={[]}
            campaignId={selected.campaign_id}
            fallbackSpaceId={spaceId}
            hideOpenSourceMission
            renderEntityPreview={renderDeliverableEntityPreview}
            onClose={() => setPreview(null)}
          />
        ) : null}
      </>
    )
  }

  return (
    <div className="p-spacing-4 gap-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between">
        <div>
          <h1 className="title-h5 text-foreground uppercase">MISSION VIEWS</h1>
          <p className="body-3 text-muted-foreground">
            Open a playbook as a visual, actionable report instead of a task list.
          </p>
        </div>
        <button
          type="button"
          className="button-glass-neutral button-compact"
          onClick={onBackToList}
        >
          Mission list
        </button>
      </div>
      {supported.length === 0 ? (
        <div className="surface-card border-border p-spacing-8 rounded-spacing-3 flex flex-col items-center border text-center">
          <LayoutDashboard className="icon-lg text-muted-foreground" />
          <p className="body-2 text-foreground mt-spacing-3 font-semibold">No playbook views yet</p>
          <p className="body-3 text-muted-foreground">
            Start Ads Research, Webinar Fulfillment, Meta Ads Analysis, or Meta Ads Launch.
          </p>
        </div>
      ) : (
        <div className="gap-spacing-3 grid lg:grid-cols-2">
          {supported.map((mission) => {
            const done = mission.status === 'done'
            return (
              <button
                key={mission.id}
                type="button"
                className="surface-card border-border hover:bg-hover-subtle p-spacing-4 gap-spacing-4 rounded-spacing-3 flex items-center border text-left transition-colors"
                onClick={() => setSelected(mission)}
              >
                {done ? (
                  <Check className="icon-md text-primary shrink-0" />
                ) : (
                  <Circle className="icon-md text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="body-2 text-foreground truncate font-semibold">{mission.title}</p>
                  <p className="body-4 text-muted-foreground">
                    {mission.subtask_done ?? 0}/{mission.subtask_total ?? 0} steps ·{' '}
                    {mission.status.replaceAll('_', ' ')}
                  </p>
                </div>
                <ArrowRight className="icon-sm text-muted-foreground shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
