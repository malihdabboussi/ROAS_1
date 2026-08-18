'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import {
  extractWorkRequestTokenFromUrl,
  fetchWorkRequestReview,
  finalizeWorkRequestReview,
  updateWorkRequestReview,
  type WorkRequestReviewResponse,
  type WorkRequestUpdate,
} from '@/lib/work-requests'
import { WORK_REQUEST_ERRORS } from '../config/errors.config'
import { WORK_REQUEST_MESSAGES } from '../config/messages.config'
import { WorkRequestChatFlow } from './WorkRequestChatFlow'
import { useWorkRequestReviewForceOpenToken } from './WorkRequestReviewForceOpenContext'

type Props = {
  title: string
  reviewUrl: string
  status?: 'pending' | 'submitted'
  summary?: string
}

/** Inline chat card that expands into the same Service Request step flow. */
export function WorkRequestChatResumeCard({
  title,
  reviewUrl,
  status = 'pending',
  summary,
}: Props) {
  const searchParams = useSearchParams()
  const forceOpenToken = useWorkRequestReviewForceOpenToken()
  const token = useMemo(() => extractWorkRequestTokenFromUrl(reviewUrl), [reviewUrl])
  const autoOpen = Boolean(
    token && (searchParams.get('wr') === token || (forceOpenToken && forceOpenToken === token)),
  )
  const [open, setOpen] = useState(autoOpen)
  const [review, setReview] = useState<WorkRequestReviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (autoOpen) setOpen(true)
  }, [autoOpen])

  useEffect(() => {
    if (!open || !token || review) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchWorkRequestReview(token)
      .then((next) => {
        if (!cancelled) setReview(next)
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error ? caught.message : WORK_REQUEST_ERRORS.LOAD_FAILED.userMessage,
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, review, token])

  const save = async (update: WorkRequestUpdate) => {
    if (!token) throw new Error(WORK_REQUEST_ERRORS.SAVE_FAILED.userMessage)
    const next = await updateWorkRequestReview(token, update)
    setReview(next)
    return next
  }

  const submit = async (update: WorkRequestUpdate) => {
    if (!token) throw new Error(WORK_REQUEST_ERRORS.FINALIZE_FAILED.userMessage)
    const saved = await updateWorkRequestReview(token, update)
    setReview(saved)
    if (saved.state !== 'draft') return saved
    if (saved.draft.missing_fields.length > 0) {
      throw new Error(WORK_REQUEST_ERRORS.FINALIZE_FAILED.userMessage)
    }
    const finalized = await finalizeWorkRequestReview(token)
    setReview(finalized)
    return finalized
  }

  if (status === 'submitted') {
    return (
      <div className="surface-card mt-spacing-3 rounded-spacing-2 border-success/30 bg-success/10 p-spacing-3 border">
        <p className="body-2 font-medium">{title}</p>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          {summary || 'Service Request submitted. Open the task links in this chat.'}
        </p>
      </div>
    )
  }

  if (open) {
    if (loading || !review) {
      return (
        <div className="surface-card border-border mt-spacing-3 rounded-spacing-3 p-spacing-3 border">
          <p className="body-3 text-muted-foreground">{error || WORK_REQUEST_MESSAGES.loading}</p>
          {error ? (
            <button
              type="button"
              className="button-glass-neutral rounded-spacing-2 body-3 mt-spacing-2 px-spacing-3 py-spacing-1"
              onClick={() => {
                setReview(null)
                setOpen(false)
              }}
            >
              Close
            </button>
          ) : null}
        </div>
      )
    }

    if (review.state !== 'draft') {
      return <WorkRequestNonDraftCard title={title} review={review} />
    }

    return (
      <WorkRequestChatFlow
        draft={review.draft}
        options={review.options}
        presentation="inline"
        onSave={save}
        onSubmit={submit}
      />
    )
  }

  return (
    <div className="surface-card border-border mt-spacing-3 rounded-spacing-3 space-y-spacing-3 p-spacing-3 border">
      <div className="gap-spacing-2 flex items-start">
        <MessageCircle className="icon-sm text-muted-foreground mt-0.5 shrink-0" />
        <div className="space-y-spacing-1 min-w-0">
          <p className="body-2 font-medium">{title}</p>
          <p className="body-3 text-muted-foreground">
            Continue this Service Request in chat — one step at a time.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="button-default button-glass-primary inline-flex"
        onClick={() => setOpen(true)}
        disabled={!token}
      >
        Continue in chat
      </button>
    </div>
  )
}

function WorkRequestNonDraftCard({
  title,
  review,
}: {
  title: string
  review: Exclude<WorkRequestReviewResponse, { state: 'draft' }>
}) {
  if (review.state === 'finalized') {
    const body =
      review.sync_status === 'synced'
        ? `${WORK_REQUEST_MESSAGES.finalizedBody} The ClickUp mirror is confirmed.`
        : WORK_REQUEST_MESSAGES.mirrorPending
    return (
      <div className="surface-card mt-spacing-3 rounded-spacing-3 space-y-spacing-3 border-success/30 bg-success/10 p-spacing-3 border">
        <div>
          <p className="body-2 font-medium">{WORK_REQUEST_MESSAGES.finalizedTitle}</p>
          <p className="body-3 text-muted-foreground mt-spacing-1">{body}</p>
        </div>
        {review.task_url || review.clickup_url ? (
          <div className="gap-spacing-2 flex flex-wrap">
            {review.task_url ? (
              <a
                href={review.task_url}
                className="button-default button-glass-primary"
                target="_blank"
                rel="noreferrer"
              >
                Open ROAS task
              </a>
            ) : null}
            {review.clickup_url ? (
              <a
                href={review.clickup_url}
                className="button-default button-glass-neutral"
                target="_blank"
                rel="noreferrer"
              >
                Open ClickUp task
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  const copy =
    review.state === 'expired'
      ? { title: WORK_REQUEST_MESSAGES.expiredTitle, body: WORK_REQUEST_MESSAGES.expiredBody }
      : review.state === 'revoked'
        ? { title: WORK_REQUEST_MESSAGES.revokedTitle, body: WORK_REQUEST_MESSAGES.revokedBody }
        : review.state === 'refresh_required'
          ? {
              title: WORK_REQUEST_MESSAGES.refreshRequiredTitle,
              body: review.message || WORK_REQUEST_MESSAGES.refreshRequiredBody,
            }
          : {
              title: WORK_REQUEST_MESSAGES.invalidTitle,
              body: review.message || WORK_REQUEST_MESSAGES.invalidBody,
            }

  return (
    <div className="surface-card border-border mt-spacing-3 rounded-spacing-3 space-y-spacing-2 p-spacing-3 border">
      <p className="body-2 font-medium">{copy.title || title}</p>
      <p className="body-3 text-muted-foreground">{copy.body}</p>
    </div>
  )
}
