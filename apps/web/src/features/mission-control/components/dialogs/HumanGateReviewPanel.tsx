import { Check, ExternalLink, MessageSquareText, UserRound } from 'lucide-react'
import type { MissionAgent, MissionDeliverable, MissionSubtask } from '../../types'
import type { SubtaskResourceLink } from './subtask-detail'

interface HumanGateReviewPanelProps {
  subtask: MissionSubtask
  dependencies: MissionSubtask[]
  agents: MissionAgent[]
  userProfile: { fullName: string; avatarUrl: string | null } | null
  deliverables: MissionDeliverable[]
  resourceLinks: SubtaskResourceLink[]
  feedback: string
  approving: boolean
  sendingFeedback: boolean
  onFeedbackChange: (value: string) => void
  onRequestChanges: () => void
  onApprove: () => void
  /** Narrow sidebar layout (desktop right column). */
  compact?: boolean
}

export function HumanGateReviewPanel({
  subtask,
  dependencies,
  agents,
  userProfile,
  deliverables,
  resourceLinks,
  feedback,
  approving,
  sendingFeedback,
  onFeedbackChange,
  onRequestChanges,
  onApprove,
  compact = false,
}: HumanGateReviewPanelProps) {
  const contributorKeys = [
    ...new Set(dependencies.map((item) => item.assigned_agent_key).filter(Boolean)),
  ] as string[]
  const contributorNames = contributorKeys.map(
    (key) => agents.find((agent) => agent.agent_key === key)?.name ?? key,
  )

  return (
    <section
      className={
        compact
          ? 'border-border bg-card rounded-spacing-2 p-spacing-4 space-y-spacing-4 border'
          : 'card-glass p-spacing-4 space-y-spacing-5'
      }
    >
      <div className="space-y-spacing-2">
        <div className="chip-glass-orange body-3 inline-flex rounded-full">Action required</div>
        <h3 className={compact ? 'body-1 text-foreground font-semibold' : 'title-h6 text-foreground'}>
          Your approval is needed
        </h3>
        <p className="body-3 text-muted-foreground">
          {subtask.intent?.story ?? 'Review the completed work before the mission continues.'}
        </p>
      </div>

      <div className="space-y-spacing-2">
        <h4 className="body-3 text-foreground font-semibold">What has been completed</h4>
        <div className="space-y-spacing-1">
          {dependencies.map((dependency) => (
            <div
              key={dependency.id}
              className="bg-muted-20 rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center"
            >
              <Check className="icon-sm text-success shrink-0" />
              <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                {dependency.title}
              </span>
              <span className="body-4 text-muted-foreground capitalize">
                {dependency.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
        <p className="body-4 text-muted-foreground">
          {deliverables.length > 0
            ? `${deliverables.length} review ${deliverables.length === 1 ? 'asset is' : 'assets are'} on the left.`
            : 'No review assets are attached yet.'}
        </p>
      </div>

      {!compact ? (
        <div className="gap-spacing-3 grid md:grid-cols-2">
          <div className="bg-muted-20 rounded-spacing-2 p-spacing-3 space-y-spacing-2">
            <div className="gap-spacing-2 flex items-center">
              <UserRound className="icon-sm text-muted-foreground" />
              <h4 className="body-2 text-foreground font-semibold">People involved</h4>
            </div>
            <p className="body-3 text-muted-foreground">
              {userProfile?.fullName || 'You'} · Approver
            </p>
            {contributorNames.map((name) => (
              <p key={name} className="body-3 text-muted-foreground">
                {name} · Contributor
              </p>
            ))}
          </div>

          <div className="bg-muted-20 rounded-spacing-2 p-spacing-3 space-y-spacing-2">
            <div className="gap-spacing-2 flex items-center">
              <ExternalLink className="icon-sm text-muted-foreground" />
              <h4 className="body-2 text-foreground font-semibold">Resources & links</h4>
            </div>
            {resourceLinks.length > 0 ? (
              resourceLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="body-3 text-primary block truncate hover:underline"
                >
                  {link.label}
                </a>
              ))
            ) : (
              <p className="body-3 text-muted-foreground">No additional links were provided.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-spacing-3">
          {contributorNames.length > 0 ? (
            <p className="body-4 text-muted-foreground">
              Contributors: {contributorNames.join(', ')}
            </p>
          ) : null}
          {resourceLinks.length > 0 ? (
            <div className="space-y-spacing-1">
              {resourceLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="body-3 text-primary block truncate hover:underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="bg-muted-20 rounded-spacing-2 p-spacing-3 space-y-spacing-1">
        <h4 className="body-3 text-foreground font-semibold">What happens next</h4>
        <p className="body-4 text-muted-foreground">
          {subtask.intent?.endState ?? 'The gate closes and the next eligible task starts.'}
        </p>
      </div>

      <div className={compact ? 'space-y-spacing-4' : 'gap-spacing-4 grid md:grid-cols-2'}>
        <div className="space-y-spacing-2">
          <h4 className="body-3 text-foreground font-semibold">If everything looks good</h4>
          <button
            type="button"
            onClick={onApprove}
            disabled={approving || sendingFeedback}
            className="button-glass-primary button-default w-full disabled:opacity-50"
          >
            {approving ? 'Approving...' : 'Approve & continue'}
          </button>
        </div>

        <div className="space-y-spacing-2">
          <div className="gap-spacing-2 flex items-center">
            <MessageSquareText className="icon-sm text-muted-foreground" />
            <h4 className="body-3 text-foreground font-semibold">If changes are needed</h4>
          </div>
          <textarea
            value={feedback}
            onChange={(event) => onFeedbackChange(event.target.value)}
            placeholder="Describe exactly what should change..."
            rows={compact ? 2 : 3}
            className="input-glass body-3 w-full resize-none"
          />
          <button
            type="button"
            onClick={onRequestChanges}
            disabled={!feedback.trim() || sendingFeedback || approving}
            className="button-glass-neutral button-default w-full disabled:opacity-50"
          >
            {sendingFeedback ? 'Sending changes...' : 'Request changes'}
          </button>
        </div>
      </div>
    </section>
  )
}
