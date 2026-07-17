import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { MISSION_CONTROL_MESSAGES } from '../../config/messages.config'
import type { MissionAgent, MissionDeliverable, MissionSubtask } from '../../types'
import {
  formatAgentShortName,
  formatRelativeTime,
  formatSubtaskStatusLabel,
} from './detail-helpers'
import { HumanGateReviewPanel } from './HumanGateReviewPanel'
import {
  getSubtaskLiveOutput,
  getSubtaskLiveStatusLabel,
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
  const hasPlanIntent = Boolean(
    subtask.intent?.why ||
    subtask.intent?.story ||
    subtask.intent?.sensory ||
    subtask.intent?.endState ||
    subtask.intent?.ecology,
  )

  return (
    <div className="py-spacing-4 min-h-0 flex-1 overflow-y-auto">
      <div className="gap-spacing-2 mb-spacing-5 flex flex-wrap items-center">
        <span className="chip-glass-neutral body-3 rounded-full">{statusLabel}</span>
        {isActiveHumanGate ? (
          <span className="chip-glass-orange body-3 rounded-full">Your turn</span>
        ) : null}
        <span className="body-3 text-muted-foreground">{agentLabel}</span>
        <span className="body-3 text-muted-foreground">
          Updated {formatRelativeTime(subtask.updated_at)}
        </span>
      </div>

      <div className="space-y-spacing-5">
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
          <section className="space-y-spacing-2">
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
            className="border-border bg-card rounded-spacing-3 p-spacing-4 space-y-spacing-2 border"
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
          <section className="space-y-spacing-2">
            <h3 className="body-2 text-warning font-semibold">Issue</h3>
            <p className="body-3 bg-muted-20 text-warning rounded-spacing-2 px-spacing-3 py-spacing-2">
              {subtask.feedback}
            </p>
          </section>
        ) : null}

        {subtask.output && Object.keys(subtask.output).length > 0 ? (
          <section className="space-y-spacing-2">
            <h3 className="body-2 text-foreground font-semibold">Agent output</h3>
            <div className="bg-muted-20 rounded-spacing-2 px-spacing-3 py-spacing-2">
              {typeof subtask.output.content === 'string' ? (
                <MarkdownRenderer className="body-3 text-muted-foreground max-w-none leading-relaxed">
                  {subtask.output.content}
                </MarkdownRenderer>
              ) : (
                <pre className="body-3 text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(subtask.output, null, 2)}
                </pre>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
