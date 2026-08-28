'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import type { MessageBubbleProps } from '@/components/chat/MessageBubbleAdapter'
import { MeetingPostCallReviewCard } from '@/components/global-chat/components/MeetingPostCallReviewCard'
import type { MeetingPostCallReview } from '@/components/global-chat/store/use-global-chat-store'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { WorkspaceSettingsModalProvider } from '@/lib/settings/workspace-settings-modal-context'
import { buildMeetingFollowUpTaskReviewPrompt } from '../config/meeting-post-call-actions.config'
import {
  fetchMeetingFollowUpReview,
  fetchMeetingFollowUpReviewChat,
  sendMeetingFollowUpReviewChat,
  updateMeetingFollowUpReview,
  type PublicMeetingFollowUpReview,
  type PublicMeetingReviewChat,
} from '../services/meeting-follow-up-review-api'

export function PublicMeetingFollowUpReviewPage({ token }: { token: string }) {
  const [payload, setPayload] = useState<PublicMeetingFollowUpReview | null>(null)
  const [chat, setChat] = useState<PublicMeetingReviewChat | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmedReview, setConfirmedReview] = useState<MeetingPostCallReview | null>(null)

  const load = useCallback(async () => {
    try {
      setPayload(await fetchMeetingFollowUpReview(token))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Meeting review unavailable')
    }
  }, [token])

  useEffect(() => void load(), [load])

  useEffect(() => {
    if (!payload?.review_started || chat) return
    void fetchMeetingFollowUpReviewChat(token)
      .then(setChat)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : 'Meeting review chat unavailable'),
      )
  }, [chat, payload?.review_started, token])

  const review = useMemo<MeetingPostCallReview | null>(() => {
    if (!payload) return null
    const meeting = payload.meeting
    return {
      spaceId: meeting.space_id,
      conversationId: meeting.conversation_id,
      meetingItemId: meeting.id,
      meetingTitle: meeting.title,
      summary: meeting.summary,
      clientWorkspace: meeting.client_workspace,
      clientCampaign: meeting.client_campaign,
      attendees: meeting.attendees.join(', '),
      followUpCount: meeting.follow_ups.length,
      followUps: meeting.follow_ups,
      followUpMessage: meeting.follow_up_message,
    }
  }, [payload])

  const clientOptions = useMemo(
    () =>
      (payload?.client_workspaces ?? []).map((option) => ({
        client_id: option.id,
        client_name: option.name,
        campaign_id: option.campaign_id,
        campaign_name: '',
        roas_space_id: option.space_id,
      })),
    [payload],
  )

  useEffect(() => {
    if (payload?.review_started && review) setConfirmedReview(review)
  }, [payload?.review_started, review])

  const continueReview = async (confirmed: MeetingPostCallReview) => {
    setSending(true)
    setError(null)
    try {
      const originalIds = new Set(payload?.meeting.follow_ups.map((item) => item.id) ?? [])
      const remainingIds = new Set(confirmed.followUps.map((item) => item.id))
      await updateMeetingFollowUpReview(token, {
        summary: confirmed.summary,
        client_campaign: confirmed.clientCampaign,
        attendees: confirmed.attendees
          .split(',')
          .map((label) => label.trim())
          .filter(Boolean),
        follow_up_message: confirmed.followUpMessage,
        dismissed_follow_up_ids: [...originalIds].filter((id) => !remainingIds.has(id)),
      })
      setConfirmedReview(confirmed)
      await sendMeetingFollowUpReviewChat(
        token,
        buildMeetingFollowUpTaskReviewPrompt(confirmed),
        () => undefined,
      )
      setChat(await fetchMeetingFollowUpReviewChat(token))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Meeting review could not continue')
    } finally {
      setSending(false)
    }
  }

  const send = async () => {
    const content = message.trim()
    if (!content || sending) return
    setSending(true)
    setMessage('')
    try {
      await sendMeetingFollowUpReviewChat(token, content, () => undefined)
      setChat(await fetchMeetingFollowUpReviewChat(token))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Message could not be sent')
    } finally {
      setSending(false)
    }
  }

  if (!payload && !error) {
    return <VibeyLoadingOrb size="lg" text="Opening meeting review..." />
  }

  return (
    <WorkspaceSettingsModalProvider>
      <main className="bg-background text-foreground min-h-dvh">
        <header className="border-border px-spacing-4 py-spacing-3 border-b">
          <div className="mx-auto w-full max-w-3xl">
            <p className="typo-caption text-muted-foreground uppercase">Pixel post-call flow</p>
            <h1 className="title-h6 mt-spacing-1 uppercase">
              {payload?.meeting.title ?? 'MEETING REVIEW'}
            </h1>
          </div>
        </header>
        <div className="mx-auto w-full max-w-3xl">
          {error ? (
            <p role="alert" className="body-3 text-destructive p-spacing-4">
              {error}
            </p>
          ) : null}
          {review && !chat && !payload?.review_started ? (
            <MeetingPostCallReviewCard
              review={review}
              clientWorkspaceOptions={clientOptions}
              onContinue={continueReview}
            />
          ) : null}
          {sending && !chat ? <VibeyLoadingOrb text="Preparing task review..." /> : null}
          {payload?.review_started && !chat && !sending ? (
            <VibeyLoadingOrb text="Opening task review..." />
          ) : null}
          {chat ? (
            <section className="gap-spacing-3 p-spacing-4 flex flex-col">
              {chat.messages.map((item) => (
                <MessageBubble
                  key={item.id}
                  message={item as MessageBubbleProps['message']}
                  isEditable={false}
                  allowFork={false}
                  conversationIdOverride={chat.conversation_id}
                />
              ))}
              <label className="gap-spacing-2 flex flex-col">
                <span className="body-3 text-muted-foreground">Message Pixel</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  className="input-glass body-3 rounded-spacing-2 border-border bg-background p-spacing-3 focus:ring-ring border outline-none focus:ring-2"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!message.trim() || sending}
                  onClick={() => void send()}
                  className="button-default button-glass-primary disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
              {confirmedReview ? (
                <section className="surface-card border-border rounded-spacing-3 p-spacing-3 gap-spacing-2 flex flex-col border">
                  <p className="body-2 text-foreground font-medium">Prepared follow-up message</p>
                  <p className="body-3 text-muted-foreground">
                    This stays available while you finish the task review. Pixel’s final draft will
                    appear above as an editable message card.
                  </p>
                  <textarea
                    value={confirmedReview.followUpMessage}
                    onChange={(event) =>
                      setConfirmedReview((current) =>
                        current ? { ...current, followUpMessage: event.target.value } : current,
                      )
                    }
                    rows={8}
                    className="input-glass body-3 rounded-spacing-2 border-border bg-background p-spacing-3 focus:ring-ring border outline-none focus:ring-2"
                  />
                </section>
              ) : null}
            </section>
          ) : null}
        </div>
      </main>
    </WorkspaceSettingsModalProvider>
  )
}
