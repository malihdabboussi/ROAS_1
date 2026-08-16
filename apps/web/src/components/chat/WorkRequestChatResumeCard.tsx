'use client'

import { MessageCircle } from 'lucide-react'

type Props = {
  title: string
  reviewUrl: string
  status?: 'pending' | 'submitted'
  summary?: string
}

/** Inline chat card that resumes the same Service Request step flow. */
export function WorkRequestChatResumeCard({
  title,
  reviewUrl,
  status = 'pending',
  summary,
}: Props) {
  if (status === 'submitted') {
    return (
      <div className="surface-card mt-spacing-3 rounded-spacing-2 border-success/30 bg-success/10 p-spacing-3 border">
        <p className="body-2 font-medium">{title}</p>
        <p className="body-3 text-muted-foreground mt-1">
          {summary || 'Service Request submitted. Open the task links in this chat.'}
        </p>
      </div>
    )
  }

  return (
    <div className="surface-card border-border mt-spacing-3 rounded-spacing-3 space-y-spacing-3 p-spacing-3 border">
      <div className="gap-spacing-2 flex items-start">
        <MessageCircle className="icon-sm text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="body-2 font-medium">{title}</p>
          <p className="body-3 text-muted-foreground">
            Continue this Service Request in chat — one step at a time, same thread.
          </p>
        </div>
      </div>
      <a href={reviewUrl} className="button-default button-glass-primary inline-flex">
        Continue in chat
      </a>
    </div>
  )
}
