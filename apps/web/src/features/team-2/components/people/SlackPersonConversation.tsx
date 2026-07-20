'use client'

import { useState } from 'react'
import { Bot, Send, ShieldCheck } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type {
  SlackDeliveryMode,
  SlackDiscoveredPerson,
  SlackPersonActivityMessage,
  SlackShadowAction,
} from '../../services/slack-people.service'

interface SlackPersonConversationProps {
  person: SlackDiscoveredPerson
  messages: SlackPersonActivityMessage[]
  actions: SlackShadowAction[]
  loading: boolean
  onCreateProposal: (content: string) => Promise<boolean>
  onReview: (id: string, status: 'approved' | 'dismissed') => void
  onSend: (id: string) => void
}

function modeHelp(mode: SlackDeliveryMode): string {
  if (mode === 'off') return 'Turn on Shadow mode before drafting.'
  if (mode === 'active') return 'Drafts still require approval. Approved drafts can be sent.'
  return 'Drafts stay here for review and cannot send while this person is in Shadow.'
}

export function SlackPersonConversation({
  person,
  messages,
  actions,
  loading,
  onCreateProposal,
  onReview,
  onSend,
}: SlackPersonConversationProps) {
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const disabled =
    person.delivery_mode === 'off' || person.relationship_kind === 'ignored' || submitting

  const submit = async () => {
    const content = draft.trim()
    if (!content || disabled) return
    setSubmitting(true)
    try {
      const created = await onCreateProposal(content)
      if (created) setDraft('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="surface-card border-border rounded-spacing-4 flex min-h-0 flex-1 flex-col overflow-hidden border">
      <header className="border-border p-spacing-4 flex shrink-0 items-center justify-between border-b">
        <div className="gap-spacing-3 flex min-w-0 items-center">
          <span className="bg-secondary text-secondary-foreground h-spacing-10 w-spacing-10 flex shrink-0 items-center justify-center rounded-full">
            <Bot className="icon-sm" />
          </span>
          <div className="min-w-0">
            <h1 className="body-2 text-foreground truncate font-semibold">
              Agent → {person.display_name}
            </h1>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              Shadow conversation · {modeHelp(person.delivery_mode)}
            </p>
          </div>
        </div>
        <span className="badge-glass badge-glass-muted body-4 capitalize">
          {person.delivery_mode}
        </span>
      </header>

      <div className="p-spacing-4 gap-spacing-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb size="sm" text="Opening the Shadow conversation..." />
          </div>
        ) : actions.length === 0 && messages.length === 0 ? (
          <div className="p-spacing-6 flex flex-1 flex-col items-center justify-center text-center">
            <ShieldCheck className="icon-lg text-primary" />
            <p className="body-2 text-foreground mt-spacing-3 font-medium">No conversation yet</p>
            <p className="body-4 text-muted-foreground mt-spacing-1 max-w-md">
              Draft the first agent message below. It will appear here as a proposal and will not
              reach Slack.
            </p>
          </div>
        ) : (
          <>
            {[...messages].reverse().map((message) => (
              <article
                key={`${message.ts}-${message.direction}`}
                className={
                  message.direction === 'outbound'
                    ? 'surface-card border-primary p-spacing-3 ml-spacing-8 rounded-spacing-3 self-end border'
                    : 'bg-secondary p-spacing-3 mr-spacing-8 rounded-spacing-3 self-start'
                }
              >
                <p className="body-4 text-muted-foreground">
                  {message.direction === 'outbound' ? 'Sent by your agent' : person.display_name}
                </p>
                <p className="body-3 text-foreground mt-spacing-1 whitespace-pre-wrap">
                  {message.text}
                </p>
              </article>
            ))}
            {[...actions].reverse().map((action) => (
              <article
                key={action.id}
                className="border-primary bg-secondary p-spacing-3 ml-spacing-8 rounded-spacing-3 self-end border"
              >
                <div className="gap-spacing-3 flex items-center justify-between">
                  <span className="body-4 text-muted-foreground">Agent proposal</span>
                  <span className="badge-glass badge-glass-muted body-4 capitalize">
                    {action.status}
                  </span>
                </div>
                <p className="body-3 text-foreground mt-spacing-2 whitespace-pre-wrap">
                  {action.proposed_content}
                </p>
                {action.status === 'proposed' ? (
                  <div className="mt-spacing-3 gap-spacing-2 flex">
                    <button
                      type="button"
                      onClick={() => onReview(action.id, 'approved')}
                      className="button-compact button-glass-primary"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReview(action.id, 'dismissed')}
                      className="button-compact button-glass-neutral"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : null}
                {action.status === 'approved' ? (
                  person.delivery_mode === 'active' ? (
                    <button
                      type="button"
                      onClick={() => onSend(action.id)}
                      className="button-compact button-glass-primary mt-spacing-3"
                    >
                      Send to Slack DM
                    </button>
                  ) : (
                    <p className="body-4 text-muted-foreground mt-spacing-3">
                      Switch this person to Active to unlock sending.
                    </p>
                  )
                ) : null}
              </article>
            ))}
          </>
        )}
      </div>

      <footer className="border-border p-spacing-3 shrink-0 border-t">
        <div className="surface-card border-border p-spacing-2 rounded-spacing-3 flex items-end border">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={disabled}
            rows={2}
            placeholder="Draft what the agent would say..."
            className="body-3 text-foreground placeholder:text-muted-foreground min-h-0 min-w-0 flex-1 resize-none bg-transparent outline-none disabled:cursor-not-allowed"
          />
          <button
            type="button"
            aria-label="Add message to Shadow review"
            title="Add to Shadow review"
            disabled={disabled || !draft.trim()}
            onClick={() => void submit()}
            className="btn-icon-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="icon-sm" />
          </button>
        </div>
        <p className="body-4 text-muted-foreground mt-spacing-2">
          This creates a proposal only. It never sends from the composer.
        </p>
      </footer>
    </section>
  )
}
