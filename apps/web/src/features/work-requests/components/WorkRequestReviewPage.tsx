'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchWorkRequestReview,
  finalizeWorkRequestReview,
  requestWorkRequestRefresh,
  updateWorkRequestReview,
  type WorkRequestReviewResponse,
  type WorkRequestUpdate,
} from '@/lib/work-requests'
import { WORK_REQUEST_ERRORS } from '../config/errors.config'
import { WORK_REQUEST_MESSAGES } from '../config/messages.config'
import { WorkRequestChatFlow } from './WorkRequestChatFlow'

export function WorkRequestReviewPage({ token }: { token: string }) {
  const [review, setReview] = useState<WorkRequestReviewResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setReview(await fetchWorkRequestReview(token))
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : WORK_REQUEST_ERRORS.LOAD_FAILED.userMessage,
      )
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (update: WorkRequestUpdate) => {
    const next = await updateWorkRequestReview(token, update)
    setReview(next)
    return next
  }

  const submit = async (update: WorkRequestUpdate) => {
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

  const askForRefresh = async () => {
    setRefreshing(true)
    try {
      setReview(await requestWorkRequestRefresh(token))
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : WORK_REQUEST_ERRORS.LOAD_FAILED.userMessage,
      )
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <main className="bg-background text-foreground min-h-dvh">
      <div className="px-spacing-4 py-spacing-8 mx-auto w-full max-w-2xl">
        <header className="mb-spacing-6 space-y-spacing-2">
          <p className="typo-section-label text-muted-foreground">ROAS SERVICE REQUEST</p>
          <h1 className="title-h6 text-foreground uppercase">CONTINUE IN CHAT</h1>
          <p className="body-3 text-muted-foreground">
            Same conversation as Slack or the portal — one step at a time. Reply in the chat or use
            the cards.
          </p>
        </header>

        {!review && !loadError ? (
          <div className="py-spacing-12 flex items-center justify-center">
            <VibeyLoadingOrb size="lg" text={WORK_REQUEST_MESSAGES.loading} />
          </div>
        ) : loadError ? (
          <StateCard
            title="SOMETHING GOT TANGLED"
            body={loadError}
            action={
              <button className="button-default button-glass-neutral" onClick={() => void load()}>
                Try again
              </button>
            }
          />
        ) : review?.state === 'draft' ? (
          <WorkRequestChatFlow
            key={review.draft.id}
            draft={review.draft}
            options={review.options}
            onSave={save}
            onSubmit={submit}
          />
        ) : review?.state === 'expired' ? (
          <StateCard
            title={WORK_REQUEST_MESSAGES.expiredTitle}
            body={WORK_REQUEST_MESSAGES.expiredBody}
            action={
              <button
                className="button-default button-glass-primary"
                disabled={refreshing}
                onClick={() => void askForRefresh()}
              >
                {refreshing ? 'Checking…' : 'Request a fresh link'}
              </button>
            }
          />
        ) : review?.state === 'revoked' ? (
          <StateCard
            title={WORK_REQUEST_MESSAGES.revokedTitle}
            body={WORK_REQUEST_MESSAGES.revokedBody}
            action={
              <button
                className="button-default button-glass-primary"
                disabled={refreshing}
                onClick={() => void askForRefresh()}
              >
                {refreshing ? 'Checking…' : 'Request a fresh link'}
              </button>
            }
          />
        ) : review?.state === 'refresh_required' ? (
          <StateCard
            title={WORK_REQUEST_MESSAGES.refreshRequiredTitle}
            body={review.message || WORK_REQUEST_MESSAGES.refreshRequiredBody}
          />
        ) : review?.state === 'finalized' ? (
          <StateCard
            success
            title={WORK_REQUEST_MESSAGES.finalizedTitle}
            body={
              review.sync_status === 'synced'
                ? `${WORK_REQUEST_MESSAGES.finalizedBody} The ClickUp mirror is confirmed.`
                : WORK_REQUEST_MESSAGES.mirrorPending
            }
            action={
              review.task_url || review.clickup_url ? (
                <div className="gap-spacing-2 flex flex-wrap">
                  {review.task_url ? (
                    <a href={review.task_url} className="button-default button-glass-primary">
                      Open ROAS task
                    </a>
                  ) : null}
                  {review.clickup_url ? (
                    <a
                      href={review.clickup_url}
                      target="_blank"
                      rel="noreferrer"
                      className="button-default button-glass-neutral"
                    >
                      Open ClickUp task
                    </a>
                  ) : null}
                </div>
              ) : undefined
            }
          />
        ) : (
          <StateCard
            title={WORK_REQUEST_MESSAGES.invalidTitle}
            body={WORK_REQUEST_MESSAGES.invalidBody}
          />
        )}

        <p className="typo-caption text-muted-foreground mt-spacing-6 text-center">
          Powered by ROAS
        </p>
      </div>
    </main>
  )
}

function StateCard({
  title,
  body,
  action,
  success = false,
}: {
  title: string
  body: string
  action?: ReactNode
  success?: boolean
}) {
  return (
    <section
      className={`surface-card rounded-spacing-4 p-spacing-6 space-y-spacing-4 border ${
        success ? 'border-success' : 'border-border'
      }`}
    >
      <div className="space-y-spacing-2">
        <span
          className={`badge-glass typo-caption ${
            success ? 'badge-glass-green' : 'badge-glass-muted'
          }`}
        >
          {success ? 'Submitted' : 'Service Request'}
        </span>
        <h2 className="title-h6 uppercase">{title}</h2>
        <p className="body-3 text-muted-foreground">{body}</p>
      </div>
      {action}
    </section>
  )
}
