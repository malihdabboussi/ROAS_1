'use client'

import { ArrowLeft, ArrowRight, Check, Circle, FileText, ListChecks } from 'lucide-react'
import type { Mission, MissionDeliverable, MissionSubtask } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import {
  matchesMissionPhase,
  matchesMissionPhaseDeliverable,
  type MissionViewDefinition,
} from '../../lib/mission-view-registry'

interface MissionPlaybookReportViewProps {
  mission: Mission
  definition: MissionViewDefinition
  subtasks: MissionSubtask[]
  deliverables: MissionDeliverable[]
  onBack: () => void
  onOpenMission: (subtaskId?: string) => void
  onOpenDeliverable: (deliverable: MissionDeliverable) => void
}

function isDone(subtask: MissionSubtask): boolean {
  return subtask.status === 'done' || subtask.status === 'cancelled'
}

export function MissionPlaybookReportView({
  mission,
  definition,
  subtasks,
  deliverables,
  onBack,
  onOpenMission,
  onOpenDeliverable,
}: MissionPlaybookReportViewProps) {
  const doneCount = subtasks.filter(isDone).length
  const nextSubtask = subtasks.find((subtask) => !isDone(subtask))
  const nextIsHuman = nextSubtask?.assignee_type === 'human'

  return (
    <div className="p-spacing-4 gap-spacing-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="gap-spacing-4 flex flex-wrap items-start justify-between">
        <div className="gap-spacing-3 flex min-w-0 items-start">
          <button type="button" className="btn-icon-glass shrink-0" onClick={onBack}>
            <ArrowLeft className="icon-sm" />
          </button>
          <div className="min-w-0">
            <p className="body-4 text-muted-foreground">{definition.eyebrow}</p>
            <h1 className="title-h5 text-foreground truncate uppercase">{mission.title}</h1>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {mission.brief || mission.description || 'Mission report'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="button-glass-neutral button-compact gap-spacing-2 inline-flex items-center"
          onClick={() => onOpenMission(nextSubtask?.id)}
        >
          <ListChecks className="icon-sm" />
          Mission details
        </button>
      </header>

      <section className="surface-card border-border rounded-spacing-3 grid border sm:grid-cols-3">
        <div className="p-spacing-4 border-border border-b sm:border-b-0 sm:border-r">
          <p className="title-h6 text-foreground">
            {doneCount}/{subtasks.length}
          </p>
          <p className="body-4 text-muted-foreground">Steps complete</p>
        </div>
        <div className="p-spacing-4 border-border border-b sm:border-b-0 sm:border-r">
          <p className="title-h6 text-foreground">{deliverables.length}</p>
          <p className="body-4 text-muted-foreground">Linked outputs</p>
        </div>
        <div className="p-spacing-4">
          <p className="title-h6 text-foreground capitalize">
            {nextIsHuman ? 'Your review' : nextSubtask ? 'Agent working' : 'Complete'}
          </p>
          <p className="body-4 text-muted-foreground">
            {nextSubtask?.title ?? 'Every mission step is resolved'}
          </p>
        </div>
      </section>

      {nextSubtask ? (
        <section className="surface-card border-border p-spacing-4 gap-spacing-3 rounded-spacing-3 flex flex-wrap items-center justify-between border">
          <div>
            <p className="typo-section-label text-muted-foreground">WHAT HAPPENS NEXT</p>
            <h2 className="body-2 text-foreground mt-spacing-1 font-semibold">
              {nextSubtask.title}
            </h2>
            <p className="body-4 text-muted-foreground">
              {nextIsHuman
                ? 'Review the linked work and approve it or request an exact revision.'
                : 'The assigned agent is advancing this step from the approved mission plan.'}
            </p>
          </div>
          <button
            type="button"
            className="button-glass-primary button-compact gap-spacing-2 inline-flex items-center"
            onClick={() => onOpenMission(nextSubtask.id)}
          >
            {nextIsHuman ? 'Review now' : 'Open step'}
            <ArrowRight className="icon-sm" />
          </button>
        </section>
      ) : null}

      <section className="gap-spacing-3 flex flex-col">
        <div>
          <p className="typo-section-label text-muted-foreground">MISSION VIEW</p>
          <h2 className="title-h6 text-foreground mt-spacing-1">WORK, OUTPUTS, AND APPROVALS</h2>
        </div>
        <div className="gap-spacing-3 grid xl:grid-cols-2">
          {definition.phases.map((phase) => {
            const phaseSubtasks = subtasks.filter((subtask) => matchesMissionPhase(phase, subtask))
            const phaseDeliverables = deliverables.filter((deliverable) =>
              matchesMissionPhaseDeliverable(phase, deliverable),
            )
            const complete =
              phaseSubtasks.length > 0 && phaseSubtasks.every((subtask) => isDone(subtask))
            return (
              <article
                key={phase.id}
                className="surface-card border-border p-spacing-4 gap-spacing-4 rounded-spacing-3 flex flex-col border"
              >
                <div className="gap-spacing-3 flex items-start">
                  {complete ? (
                    <Check className="icon-md text-primary shrink-0" />
                  ) : (
                    <Circle className="icon-md text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <h3 className="body-1 text-foreground font-semibold">{phase.label}</h3>
                    <p className="body-4 text-muted-foreground">{phase.description}</p>
                  </div>
                </div>

                <div className="gap-spacing-2 flex flex-col">
                  {phaseSubtasks.map((subtask) => (
                    <button
                      key={subtask.id}
                      type="button"
                      className="bg-secondary hover:bg-hover-subtle p-spacing-3 gap-spacing-3 rounded-spacing-2 flex items-center text-left transition-colors"
                      onClick={() => onOpenMission(subtask.id)}
                    >
                      {isDone(subtask) ? (
                        <Check className="icon-sm text-primary shrink-0" />
                      ) : (
                        <Circle className="icon-sm text-muted-foreground shrink-0" />
                      )}
                      <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                        {subtask.title}
                      </span>
                      <span
                        className={cn(
                          'badge-glass body-4',
                          isDone(subtask) ? 'badge-glass-green' : 'badge-glass-amber',
                        )}
                      >
                        {subtask.status.replaceAll('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>

                {phaseDeliverables.length > 0 ? (
                  <div className="border-border pt-spacing-3 gap-spacing-2 flex flex-wrap border-t">
                    {phaseDeliverables.map((deliverable) => (
                      <button
                        key={deliverable.id}
                        type="button"
                        className="button-glass-neutral button-compact gap-spacing-2 inline-flex items-center"
                        onClick={() => onOpenDeliverable(deliverable)}
                      >
                        <FileText className="icon-sm" />
                        {deliverable.title.replace(/^Task \d+\s*[—-]\s*/, '')}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
