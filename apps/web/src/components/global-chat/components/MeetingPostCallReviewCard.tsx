'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { MEETING_POST_CALL_REVIEW_MESSAGES } from '@/features/home/config/meeting-post-call-actions.config'
import {
  toClientOnlyMapping,
  useClientCampaignGroups,
  type ClientCampaignMapping,
} from '@/lib/agency-clients'
import type { MeetingPostCallReview } from '../store/use-global-chat-store'

export function MeetingPostCallReviewCard({
  review,
  onContinue,
  clientWorkspaceOptions,
}: {
  review: MeetingPostCallReview
  onContinue: (review: MeetingPostCallReview) => void | Promise<void>
  clientWorkspaceOptions?: ClientCampaignMapping[]
}) {
  const [draft, setDraft] = useState(review)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { groups } = useClientCampaignGroups(clientWorkspaceOptions === undefined)
  const options =
    clientWorkspaceOptions ??
    (groups ?? []).filter((group) => !group.inactive).map(toClientOnlyMapping)

  useEffect(() => setDraft(review), [review])

  return (
    <div className="border-border bg-background px-spacing-4 py-spacing-3 border-b">
      <div className="surface-card border-border rounded-spacing-3 space-y-spacing-3 p-spacing-3 border">
        <div>
          <p className="body-2 text-foreground font-medium">
            {MEETING_POST_CALL_REVIEW_MESSAGES.title}
          </p>
          <p className="body-3 text-muted-foreground">
            {MEETING_POST_CALL_REVIEW_MESSAGES.description}
          </p>
        </div>

        <label className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">
            {MEETING_POST_CALL_REVIEW_MESSAGES.summaryLabel}
          </span>
          <textarea
            value={draft.summary}
            rows={4}
            onChange={(event) =>
              setDraft((current) => ({ ...current, summary: event.target.value }))
            }
            className="body-3 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 focus:ring-ring w-full resize-y border outline-none focus:ring-2"
          />
        </label>

        <label className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">
            {MEETING_POST_CALL_REVIEW_MESSAGES.clientWorkspaceLabel}
          </span>
          <select
            value={draft.clientCampaign?.client_id ?? ''}
            onChange={(event) => {
              const selected =
                options.find((option) => option.client_id === event.target.value) ?? null
              setDraft((current) => ({
                ...current,
                clientCampaign: selected,
                clientWorkspace: selected?.client_name ?? '',
              }))
            }}
            className="input-glass body-3 rounded-spacing-2 border-border bg-background h-spacing-9 px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
            aria-label={MEETING_POST_CALL_REVIEW_MESSAGES.clientWorkspaceLabel}
          >
            <option value="">Select client workspace</option>
            {options.map((option) => (
              <option key={option.client_id} value={option.client_id}>
                {option.client_name}
              </option>
            ))}
          </select>
        </label>

        <label className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">
            {MEETING_POST_CALL_REVIEW_MESSAGES.attendeesLabel}
          </span>
          <input
            value={draft.attendees}
            onChange={(event) =>
              setDraft((current) => ({ ...current, attendees: event.target.value }))
            }
            className="body-3 rounded-spacing-2 border-border bg-background h-spacing-9 px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
          />
        </label>

        <div className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">
            {MEETING_POST_CALL_REVIEW_MESSAGES.followUpCountLabel} ({draft.followUps.length})
          </span>
          {draft.followUps.map((followUp) => (
            <div
              key={followUp.id}
              className="border-border rounded-spacing-2 body-3 gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center border"
            >
              <span className="min-w-0 flex-1">{followUp.title}</span>
              <button
                type="button"
                className="btn-icon-bare text-destructive shrink-0"
                aria-label={`Dismiss ${followUp.title}`}
                onClick={() =>
                  setDraft((current) => {
                    const followUps = current.followUps.filter((item) => item.id !== followUp.id)
                    return { ...current, followUps, followUpCount: followUps.length }
                  })
                }
              >
                <X className="icon-xs" aria-hidden />
              </button>
            </div>
          ))}
        </div>

        <label className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">
            {MEETING_POST_CALL_REVIEW_MESSAGES.followUpMessageLabel}
          </span>
          <textarea
            value={draft.followUpMessage}
            rows={6}
            onChange={(event) =>
              setDraft((current) => ({ ...current, followUpMessage: event.target.value }))
            }
            className="body-3 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 focus:ring-ring w-full resize-y border outline-none focus:ring-2"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={async () => {
              setSubmitting(true)
              setSubmitError(null)
              try {
                await onContinue(draft)
              } catch {
                setSubmitError(MEETING_POST_CALL_REVIEW_MESSAGES.continueError)
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={!draft.summary.trim() || submitting}
            className="button-glass-accent rounded-spacing-2 body-3 px-spacing-4 py-spacing-2 font-medium disabled:opacity-50"
          >
            {submitting
              ? MEETING_POST_CALL_REVIEW_MESSAGES.continuingLabel
              : MEETING_POST_CALL_REVIEW_MESSAGES.continueLabel}
          </button>
        </div>
        {submitError ? (
          <p role="alert" className="body-3 text-destructive">
            {submitError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
