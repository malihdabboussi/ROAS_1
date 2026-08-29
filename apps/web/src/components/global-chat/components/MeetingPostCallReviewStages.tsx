'use client'

import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import type { MessageBubbleProps } from '@/components/chat/MessageBubbleAdapter'
import type { MeetingDelegationPreview } from '@/features/home/services/meeting-follow-up-review-api'
import type { MeetingPostCallReview } from '../store/use-global-chat-store'

export function MeetingTaskReviewStep({
  preview,
  onComplete,
}: {
  preview: MeetingDelegationPreview
  onComplete: () => void
}) {
  return (
    <section className="surface-card border-border rounded-spacing-3 m-spacing-4 p-spacing-4 gap-spacing-3 flex flex-col border">
      <div>
        <h2 className="title-h6 uppercase">REVIEW AND DELEGATE TASKS</h2>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Review and confirm each task below using the existing bulk delegation flow.
        </p>
      </div>
      <iframe
        className="border-border rounded-spacing-2 h-screen w-full border"
        src={preview.confirm_url}
        title="Bulk task delegation review"
      />
      <div className="flex justify-end">
        <button type="button" className="button-default button-glass-primary" onClick={onComplete}>
          I finished task review
        </button>
      </div>
    </section>
  )
}

export function MeetingFollowUpMessageStep({ review }: { review: MeetingPostCallReview }) {
  const message: MessageBubbleProps['message'] = {
    id: `meeting-follow-up-${review.meetingItemId}`,
    conversation_id: review.conversationId || review.meetingItemId,
    role: 'assistant',
    content: `\`\`\`draft Follow-up message\n${review.followUpMessage}\n\`\`\``,
    content_blocks: null,
    metadata: {},
    created_at: new Date().toISOString(),
  }
  return (
    <section className="p-spacing-4 gap-spacing-2 flex flex-col">
      <div>
        <h2 className="title-h6 uppercase">FINALIZE FOLLOW-UP MESSAGE</h2>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Edit the prepared message, then copy it when it is ready. Nothing is sent automatically.
        </p>
      </div>
      <MessageBubble
        message={message}
        isEditable={false}
        allowFork={false}
        conversationIdOverride={message.conversation_id}
      />
    </section>
  )
}
