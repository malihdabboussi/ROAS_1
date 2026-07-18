import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { MISSION_CONTROL_MESSAGES } from '../../config/messages.config'
import type { MissionAgent, MissionDeliverable, MissionSubtask } from '../../types'
import {
  formatAgentShortName,
  formatRelativeTime,
  formatSubtaskStatusLabel,
  subtaskStatusBadgeTone,
} from './detail-helpers'
import { HumanGateReviewPanel } from './HumanGateReviewPanel'
import {
  getSubtaskLiveOutput,
  getSubtaskLiveStatusLabel,
  resolveSubtaskOutputDisplay,
  type SubtaskResourceLink,
} from './subtask-detail'
import { SubtaskPlanIntent } from './SubtaskPlanIntent'

interface SubtaskDetailContentProps {
  subtask: MissionSubtask
  agents: MissionAgent[]
  userProfile: { fullName: string; avatarUrl: string | null } | null
  deliverables: MissionDeliverable[]
  resourceLinks: SubtaskResourceLink[]
  dependencies: MissionSubtask[]
  feedback: string
  approving: boolean
  sendingFeedback: boolean
  onFeedbackChange: (value: string) => void
  onRequestChanges: () => void
  onApprove: () => void
  /** Desktop puts the gate panel in the right sidebar; mobile keeps it inline. */
  showHumanGateInline?: boolean
}

export function SubtaskDetailContent({
  subtask,
  agents,
  userProfile,
  deliverables,
  resourceLinks,
  dependencies,
  feedback,
  approving,
  sendingFeedback,
  onFeedbackChange,
  onRequestChanges,
  onApprove,
  showHumanGateInline = true,
}: SubtaskDetailContentProps) {
  const agent = agents.find((item) => item.agent_key === subtask.assigned_agent_key)
  const agentLabel =
    subtask.assignee_type === 'human'
      ? userProfile?.fullName || 'You'
      : formatAgentShortName(agent?.name ?? subtask.assigned_agent_key ?? '') ||
        agent?.name ||
        subtask.assigned_agent_key ||
        'Unassigned'
  const isActiveHumanGate = subtask.assignee_type === 'human' && subtask.status === 'awaiting_human'
  const liveOutput = getSubtaskLiveOutput(subtask)
  const statusLabel =
    subtask.status === 'in_progress'
      ? getSubtaskLiveStatusLabel(subtask, deliverables.length > 0)
      : formatSubtaskStatusLabel(subtask.status)
  const statusTone = subtaskStatusBadgeTone(subtask.status, {
    awaitingHuman: isActiveHumanGate,
  })
  const hasPlanIntent = Boolean(
    subtask.intent?.why ||
    subtask.intent?.story ||
    subtask.intent?.sensory ||
    subtask.intent?.endState ||
    subtask.intent?.ecology,
  )
  const outputDisplay = resolveSubtaskOutputDisplay(subtask.output)

  return (
    <div className="py-spacing-2 min-h-0 flex-1 overflow-y-auto">
      <div className="gap-spacing-2 mb-spacing-3 flex flex-wrap items-center">
        <span className={`badge-glass badge-glass-sm ${statusTone}`}>{statusLabel}</span>
        <span className="body-4 text-muted-foreground">{agentLabel}</span>
        <span className="text-muted-foreground/40" aria-hidden>
          ·
        </span>
        <span className="body-4 text-muted-foreground">
          Updated {formatRelativeTime(subtask.updated_at)}
        </span>
      </div>

      <div className="space-y-spacing-3">
        {isActiveHumanGate && showHumanGateInline ? (
          <HumanGateReviewPanel
            subtask={subtask}
            dependencies={dependencies}
            agents={agents}
            userProfile={userProfile}
            deliverables={deliverables}
            resourceLinks={resourceLinks}
            feedback={feedback}
            approving={approving}
            sendingFeedback={sendingFeedback}
            onFeedbackChange={onFeedbackChange}
            onRequestChanges={onRequestChanges}
            onApprove={onApprove}
          />
        ) : null}

        {isActiveHumanGate && !showHumanGateInline ? (
          <section className="space-y-spacing-1">
            <h3 className="body-2 text-foreground font-semibold">Review package</h3>
            <p className="body-3 text-muted-foreground">
              {subtask.intent?.story ??
                'Open the deliverables below, then approve or request changes in the panel on the right.'}
            </p>
            {dependencies.length > 0 ? (
              <p className="body-3 text-muted-foreground">
                {dependencies.length} upstream step{dependencies.length === 1 ? '' : 's'} ready ·{' '}
                {deliverables.length > 0
                  ? `${deliverables.length} review asset${deliverables.length === 1 ? '' : 's'} attached`
                  : 'no review assets yet'}
              </p>
            ) : null}
          </section>
        ) : null}

        {hasPlanIntent && !isActiveHumanGate && subtask.intent ? (
          <SubtaskPlanIntent intent={subtask.intent} />
        ) : null}

        {liveOutput ? (
          <section
            className="border-border rounded-spacing-2 p-spacing-3 space-y-spacing-2 border"
            aria-live="polite"
          >
            <div className="gap-spacing-2 flex items-center">
              <span className="indicator-dot-glass-blue shrink-0" aria-hidden="true" />
              <h3 className="body-2 text-foreground font-semibold">
                {MISSION_CONTROL_MESSAGES.SUBTASK_LIVE_DRAFT_TITLE}
              </h3>
            </div>
            <p className="body-4 text-muted-foreground">
              {MISSION_CONTROL_MESSAGES.SUBTASK_LIVE_DRAFT_DESCRIPTION}
            </p>
            <div className="bg-muted-20 rounded-spacing-2 px-spacing-3 py-spacing-2 max-h-64 overflow-y-auto">
              <MarkdownRenderer className="body-3 text-muted-foreground max-w-none leading-relaxed">
                {liveOutput}
              </MarkdownRenderer>
            </div>
          </section>
        ) : null}

        {subtask.feedback ? (
          <section className="space-y-spacing-1">
            <h3 className="body-2 text-warning font-semibold">Issue</h3>
            <p className="body-3 bg-muted-20 text-warning rounded-spacing-2 px-spacing-3 py-spacing-2">
              {subtask.feedback}
            </p>
          </section>
        ) : null}

        {outputDisplay ? (
          <section className="space-y-spacing-1">
            <h3 className="body-2 text-foreground font-semibold">
              {outputDisplay.titleKey === 'human'
                ? MISSION_CONTROL_MESSAGES.SUBTASK_OUTPUT_HUMAN_TITLE
                : MISSION_CONTROL_MESSAGES.SUBTASK_OUTPUT_AGENT_TITLE}
            </h3>
            <div className="border-border rounded-spacing-2 px-spacing-3 py-spacing-2 border">
              <MarkdownRenderer className="body-3 text-muted-foreground max-w-none leading-relaxed">
                {outputDisplay.body}
              </MarkdownRenderer>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
