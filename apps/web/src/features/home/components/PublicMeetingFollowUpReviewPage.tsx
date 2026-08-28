'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MeetingPostCallReviewCard } from '@/components/global-chat/components/MeetingPostCallReviewCard'
import {
  MeetingFollowUpMessageStep,
  MeetingTaskReviewStep,
} from '@/components/global-chat/components/MeetingPostCallReviewStages'
import type { MeetingPostCallReview } from '@/components/global-chat/store/use-global-chat-store'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { WorkspaceSettingsModalProvider } from '@/lib/settings/workspace-settings-modal-context'
import {
  createMeetingDelegationPreview,
  fetchMeetingFollowUpReview,
  updateMeetingFollowUpReview,
  type MeetingDelegationPreview,
  type PublicMeetingFollowUpReview,
} from '../services/meeting-follow-up-review-api'

type ReviewStage = 'context' | 'tasks' | 'message'

export function PublicMeetingFollowUpReviewPage({ token }: { token: string }) {
  const [payload, setPayload] = useState<PublicMeetingFollowUpReview | null>(null)
  const [stage, setStage] = useState<ReviewStage>('context')
  const [preview, setPreview] = useState<MeetingDelegationPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      setPayload(await fetchMeetingFollowUpReview(token))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Meeting review unavailable')
    }
  }, [token])

  useEffect(() => void load(), [load])

  const review = useMemo(() => (payload ? toReview(payload) : null), [payload])
  const clientOptions = useMemo(
    () =>
      (payload?.client_workspaces ?? []).map((option) => ({
        client_id: option.id,
        client_name: option.name,
        campaign_id: option.campaign_id,
        campaign_name: option.name,
        roas_space_id: option.space_id,
      })),
    [payload],
  )

  const continueReview = async (confirmed: MeetingPostCallReview) => {
    setSubmitting(true)
    setError(null)
    try {
      const originalIds = new Set(payload?.meeting.follow_ups.map((item) => item.id) ?? [])
      const remainingIds = new Set(confirmed.followUps.map((item) => item.id))
      const saved = await updateMeetingFollowUpReview(token, {
        summary: confirmed.summary,
        client_campaign: confirmed.clientCampaign,
        attendee_ids: confirmed.attendeeIds,
        call_kind: confirmed.callKind,
        call_status: confirmed.callStatus,
        follow_up_message: confirmed.followUpMessage,
        dismissed_follow_up_ids: [...originalIds].filter((id) => !remainingIds.has(id)),
        follow_ups: confirmed.followUps.map((item) => ({
          id: item.id,
          title: item.title,
          owner: item.owner,
          due_date: item.dueDate,
        })),
      })
      const delegationPreview = await createMeetingDelegationPreview(token)
      setPayload(saved)
      setPreview(delegationPreview)
      setStage('tasks')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Task review could not be prepared. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!payload && !error) return <VibeyLoadingOrb size="lg" text="Opening meeting review..." />

  return (
    <WorkspaceSettingsModalProvider>
      <main className="bg-background text-foreground min-h-dvh">
        <ReviewHeader title={payload?.meeting.title ?? 'MEETING REVIEW'} />
        <div className="mx-auto w-full max-w-3xl">
          {error ? <ReviewError message={error} onRetry={() => setError(null)} /> : null}
          {review && stage === 'context' ? (
            <MeetingPostCallReviewCard
              review={review}
              clientWorkspaceOptions={clientOptions}
              onContinue={continueReview}
            />
          ) : null}
          {submitting ? <VibeyLoadingOrb text="Preparing task review..." /> : null}
          {stage === 'tasks' && preview ? (
            <MeetingTaskReviewStep preview={preview} onComplete={() => setStage('message')} />
          ) : null}
          {stage === 'message' && review ? <MeetingFollowUpMessageStep review={review} /> : null}
        </div>
      </main>
    </WorkspaceSettingsModalProvider>
  )
}

function toReview(payload: PublicMeetingFollowUpReview): MeetingPostCallReview {
  const meeting = payload.meeting
  return {
    spaceId: meeting.space_id,
    conversationId: meeting.conversation_id,
    meetingItemId: meeting.id,
    meetingTitle: meeting.title,
    summary: meeting.summary,
    clientWorkspace: meeting.client_workspace,
    clientCampaign: meeting.client_campaign,
    attendeeIds: meeting.attendee_ids,
    attendees: meeting.attendees.join(', '),
    callKind: meeting.call_kind,
    callStatus: meeting.call_status,
    fields: {
      callKind: meeting.fields.call_kind,
      callStatus: meeting.fields.call_status,
      attendees: meeting.fields.attendees,
    },
    followUpCount: meeting.follow_ups.length,
    followUps: meeting.follow_ups.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      owner: item.owner,
      dueDate: item.due_date,
    })),
    followUpMessage: meeting.follow_up_message,
  }
}

function ReviewHeader({ title }: { title: string }) {
  return (
    <header className="border-border px-spacing-4 py-spacing-3 border-b">
      <div className="mx-auto w-full max-w-3xl">
        <p className="typo-caption text-muted-foreground uppercase">Pixel post-call flow</p>
        <h1 className="title-h6 mt-spacing-1 uppercase">{title}</h1>
      </div>
    </header>
  )
}

function ReviewError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="surface-card border-border rounded-spacing-3 m-spacing-4 p-spacing-4 gap-spacing-3 flex items-center justify-between border"
    >
      <p className="body-3 text-destructive">{message}</p>
      <button type="button" className="button-default button-glass-neutral" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
