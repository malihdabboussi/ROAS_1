import { Check, ExternalLink, MessageSquareText, UserRound } from 'lucide-react'
import type { MissionAgent, MissionDeliverable, MissionSubtask } from '../../types'
import { HumanGateReviewAssets } from './HumanGateReviewAssets'
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
  onRequestChanges: () => void
  onApprove: () => void
  onSelectDeliverable: (deliverable: MissionDeliverable) => void
  /** Narrow sidebar layout (desktop right column). */
  compact?: boolean
  /** Inside Activity card — drop outer chrome so it is one panel. */
  embedded?: boolean
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
  onRequestChanges,
  onApprove,
  onSelectDeliverable,
  compact = false,
  embedded = false,
}: HumanGateReviewPanelProps) {
  const contributorKeys = [
    ...new Set(dependencies.map((item) => item.assigned_agent_key).filter(Boolean)),
  ] as string[]
  const contributorNames = contributorKeys.map(
    (key) => agents.find((agent) => agent.agent_key === key)?.name ?? key,
  )
  const deliverableUrls = new Set(
    deliverables
      .map((deliverable) => deliverable.file_url)
      .filter((url): url is string => Boolean(url)),
  )
  const supplementalResourceLinks = resourceLinks.filter((link) => !deliverableUrls.has(link.url))

  return (
    <section
      className={
        embedded
          ? 'space-y-spacing-4'
          : compact
            ? 'border-border bg-card rounded-spacing-2 p-spacing-4 space-y-spacing-4 border'
            : 'card-glass p-spacing-4 space-y-spacing-5'
      }
    >
      <div className="space-y-spacing-2">
        <div className="chip-glass-orange body-3 inline-flex rounded-full">Action required</div>
        <h3
          className={compact ? 'body-1 text-foreground font-semibold' : 'title-h6 text-foreground'}
        >
          Your approval is needed
        </h3>
        <p className="body-3 text-muted-foreground">
          {subtask.intent?.story ?? 'Review the completed work before the mission continues.'}
        </p>
      </div>

      {dependencies.length > 0 ? (
        <div className="space-y-spacing-2">
          <h4 className="body-3 text-foreground font-semibold">Upstream steps ready</h4>
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
              ? `${deliverables.length} review ${deliverables.length === 1 ? 'asset is' : 'assets are'} ready below.`
              : 'No review assets are attached yet.'}
          </p>
        </div>
      ) : null}

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
            {supplementalResourceLinks.length > 0 ? (
              supplementalResourceLinks.map((link) => (
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
          {supplementalResourceLinks.length > 0 ? (
            <div className="space-y-spacing-1">
              {supplementalResourceLinks.map((link) => (
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

      <HumanGateReviewAssets
        deliverables={deliverables}
        onSelectDeliverable={onSelectDeliverable}
      />

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
          <p className="body-4 text-muted-foreground">
            If changes are needed, put them in the box below.
          </p>
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
