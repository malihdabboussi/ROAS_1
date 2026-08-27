'use client'

import { useEffect, useState } from 'react'
import { MEETING_POST_CALL_REVIEW_MESSAGES } from '@/features/home/config/meeting-post-call-actions.config'
import type { MeetingPostCallReview } from '../store/use-global-chat-store'

export function MeetingPostCallReviewCard({
  review,
  onContinue,
}: {
  review: MeetingPostCallReview
  onContinue: (review: MeetingPostCallReview) => void
}) {
  const [draft, setDraft] = useState(review)

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
            onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
            className="body-3 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 focus:ring-ring w-full resize-y border outline-none focus:ring-2"
          />
        </label>

        <label className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">
            {MEETING_POST_CALL_REVIEW_MESSAGES.clientWorkspaceLabel}
          </span>
          <input
            value={draft.clientWorkspace}
            onChange={(event) =>
              setDraft((current) => ({ ...current, clientWorkspace: event.target.value }))
            }
            className="body-3 rounded-spacing-2 border-border bg-background h-spacing-9 px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
          />
        </label>

        <label className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">
            {MEETING_POST_CALL_REVIEW_MESSAGES.attendeesLabel}
          </span>
          <input
            value={draft.attendees}
            onChange={(event) => setDraft((current) => ({ ...current, attendees: event.target.value }))}
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
              className="border-border rounded-spacing-2 body-3 px-spacing-3 py-spacing-2 border"
            >
              {followUp.title}
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
            onClick={() => onContinue(draft)}
            disabled={!draft.summary.trim()}
            className="button-glass-accent rounded-spacing-2 body-3 px-spacing-4 py-spacing-2 font-medium disabled:opacity-50"
          >
            {MEETING_POST_CALL_REVIEW_MESSAGES.continueLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
