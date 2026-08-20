'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { createClient } from '@/lib/supabase/client'
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
import { WorkRequestFinalizedActions, workRequestFinalizedBody } from './WorkRequestFinalizedActions'
import { WorkRequestReviewChatHost } from './WorkRequestReviewChatHost'

export function WorkRequestReviewPage({ token }: { token: string }) {
  const router = useRouter()
  const [review, setReview] = useState<WorkRequestReviewResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [mirrorError, setMirrorError] = useState<string | null>(null)
  const [authRedirecting, setAuthRedirecting] = useState(false)

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

  useEffect(() => {
    if (!review || review.state !== 'draft') return
    const conversationId = review.draft.resume_conversation_id
    if (!conversationId) return

    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled || !user) return
      setAuthRedirecting(true)
      router.replace(
        `/home?conv=${encodeURIComponent(conversationId)}&wr=${encodeURIComponent(token)}`,
      )
    })()

    return () => {
      cancelled = true
    }
  }, [review, router, token])

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

  const remirror = async () => {
    const next = await finalizeWorkRequestReview(token)
    setReview(next)
    return next
  }

  const retryMirror = async () => {
    setRetrying(true)
    setMirrorError(null)
    try {
      await remirror()
    } catch (error) {
      setMirrorError(
        error instanceof Error
          ? error.message
          : WORK_REQUEST_ERRORS.MIRROR_RETRY_FAILED.userMessage,
      )
    } finally {
      setRetrying(false)
    }
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

  if (authRedirecting) {
    return (
      <main className="bg-background text-foreground flex min-h-dvh items-center justify-center">
        <VibeyLoadingOrb size="lg" text={WORK_REQUEST_MESSAGES.openingChat} />
      </main>
    )
  }

  return (
    <main className="bg-background text-foreground min-h-dvh">
      {!review && !loadError ? (
        <div className="flex min-h-dvh items-center justify-center">
          <VibeyLoadingOrb size="lg" text={WORK_REQUEST_MESSAGES.loading} />
        </div>
      ) : loadError ? (
        <div className="px-spacing-4 py-spacing-8 mx-auto w-full max-w-2xl">
          <StateCard
            title="SOMETHING GOT TANGLED"
            body={loadError}
            action={
              <button className="button-default button-glass-neutral" onClick={() => void load()}>
                Try again
              </button>
            }
          />
        </div>
      ) : review?.state === 'draft' ? (
        review.draft.resume_conversation_id ? (
          <WorkRequestReviewChatHost
            key={review.draft.id}
            token={token}
            draft={review.draft}
            options={review.options}
            onSave={save}
            onSubmit={submit}
            onRetryMirror={remirror}
          />
        ) : (
          <WorkRequestChatFlow
            key={review.draft.id}
            draft={review.draft}
            options={review.options}
            presentation="page"
            onSave={save}
            onSubmit={submit}
            onRetryMirror={remirror}
          />
        )
      ) : review?.state === 'expired' ? (
        <div className="px-spacing-4 py-spacing-8 mx-auto w-full max-w-2xl">
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
        </div>
      ) : review?.state === 'revoked' ? (
        <div className="px-spacing-4 py-spacing-8 mx-auto w-full max-w-2xl">
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
        </div>
      ) : review?.state === 'refresh_required' ? (
        <div className="px-spacing-4 py-spacing-8 mx-auto w-full max-w-2xl">
          <StateCard
            title={WORK_REQUEST_MESSAGES.refreshRequiredTitle}
            body={review.message || WORK_REQUEST_MESSAGES.refreshRequiredBody}
          />
        </div>
      ) : review?.state === 'finalized' ? (
        <div className="px-spacing-4 py-spacing-8 mx-auto w-full max-w-2xl">
          <StateCard
            success
            title={WORK_REQUEST_MESSAGES.finalizedTitle}
            body={workRequestFinalizedBody(review)}
            error={mirrorError}
            action={
              <WorkRequestFinalizedActions
                receipt={review}
                retrying={retrying}
                onRetry={
                  review.sync_status === 'synced' ? undefined : () => void retryMirror()
                }
              />
            }
          />
        </div>
      ) : (
        <div className="px-spacing-4 py-spacing-8 mx-auto w-full max-w-2xl">
          <StateCard
            title={WORK_REQUEST_MESSAGES.invalidTitle}
            body={WORK_REQUEST_MESSAGES.invalidBody}
          />
        </div>
      )}
    </main>
  )
}

function StateCard({
  title,
  body,
  action,
  error,
  success = false,
}: {
  title: string
  body: string
  action?: ReactNode
  error?: string | null
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
        {error ? (
          <p role="alert" className="body-3 text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      {action}
    </section>
  )
}
