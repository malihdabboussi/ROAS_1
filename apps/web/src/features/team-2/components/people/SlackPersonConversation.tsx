'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, Bot, Info, MessageSquareReply, Send, ShieldCheck } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { SLACK_PEOPLE_MESSAGES } from '../../config/messages.config'
import { useLatestMessageScroll } from '../../hooks/use-latest-message-scroll'
import { slackMrkdwnToMarkdown } from '../../lib/slack-message-markdown'
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

function formatTimestamp(value: string, slackTimestamp = false): string {
  const date = slackTimestamp ? new Date(Number(value) * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function proposalLabel(action: SlackShadowAction): string {
  if (action.metadata?.source === 'admin_test') return 'Sample message · never auto-sent'
  if (action.metadata?.source === 'meeting_follow_up_assignee_reminder') {
    return action.status === 'sent'
      ? SLACK_PEOPLE_MESSAGES.POST_CALL_SENT_LABEL
      : SLACK_PEOPLE_MESSAGES.POST_CALL_SHADOW_LABEL
  }
  if (action.status === 'sent') return 'Sent to Slack'
  return 'Shadow proposal · not sent'
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
  const timeline = useMemo(() => {
    const actualMessageTs = new Set(messages.map((message) => message.ts))
    return [
      ...messages.map((message) => ({
        kind: 'message' as const,
        timestamp: Number(message.ts) * 1000,
        message,
      })),
      ...actions
        .filter((action) => {
          const slackTs = action.metadata?.slack_message_ts
          return typeof slackTs !== 'string' || !actualMessageTs.has(slackTs)
        })
        .map((action) => ({
          kind: 'action' as const,
          timestamp: new Date(action.created_at).getTime(),
          action,
        })),
    ].sort((a, b) => a.timestamp - b.timestamp)
  }, [actions, messages])
  const { scrollRef, handleScroll, scrollToLatest, showJumpToLatest } = useLatestMessageScroll(
    person.id,
    timeline.length,
  )

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

      <div className="relative flex min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="p-spacing-4 gap-spacing-3 flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
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
            timeline.map((entry) => {
              if (entry.kind === 'message') {
                const { message } = entry
                const agentMessage = message.direction === 'outbound'
                return (
                  <article
                    key={`${message.ts}-${message.direction}`}
                    className={`${
                      agentMessage
                        ? 'surface-card border-primary mr-spacing-8 self-start border'
                        : 'bg-secondary ml-spacing-8 self-end'
                    } ${message.is_thread_reply ? 'ml-spacing-6' : ''} p-spacing-3 rounded-spacing-3`}
                  >
                    <div className="gap-spacing-2 flex flex-wrap items-center">
                      <span className="body-4 text-muted-foreground">
                        {agentMessage ? 'Agent' : person.display_name}
                      </span>
                      <span className="badge-glass badge-glass-muted body-4">
                        Actual Slack message
                      </span>
                      <time className="body-4 text-muted-foreground" dateTime={message.ts}>
                        {formatTimestamp(message.ts, true)}
                      </time>
                    </div>
                    {message.is_thread_reply ? (
                      <p className="body-4 text-muted-foreground mt-spacing-2 gap-spacing-1 flex items-center">
                        <MessageSquareReply className="icon-xs" /> Thread reply
                      </p>
                    ) : null}
                    <MarkdownRenderer
                      compact
                      className="body-3 text-foreground mt-spacing-2 max-w-none"
                    >
                      {slackMrkdwnToMarkdown(message.text)}
                    </MarkdownRenderer>
                  </article>
                )
              }
              const { action } = entry
              return (
                <article
                  key={action.id}
                  className="border-primary bg-secondary p-spacing-3 mr-spacing-8 rounded-spacing-3 self-start border"
                >
                  <div className="gap-spacing-3 flex items-center justify-between">
                    <div className="gap-spacing-2 flex flex-wrap items-center">
                      <span className="body-4 text-muted-foreground">Agent</span>
                      <span className="badge-glass badge-glass-muted body-4">
                        {proposalLabel(action)}
                      </span>
                      <time className="body-4 text-muted-foreground" dateTime={action.created_at}>
                        {formatTimestamp(action.created_at)}
                      </time>
                    </div>
                    <div className="gap-spacing-2 flex items-center">
                      {action.rationale ? (
                        <span
                          title={action.rationale}
                          aria-label={`Why the agent drafted this: ${action.rationale}`}
                          className="text-muted-foreground cursor-help"
                        >
                          <Info className="icon-xs" />
                        </span>
                      ) : null}
                      <span className="badge-glass badge-glass-muted body-4 capitalize">
                        {action.status}
                      </span>
                    </div>
                  </div>
                  <MarkdownRenderer
                    compact
                    className="body-3 text-foreground mt-spacing-2 max-w-none"
                  >
                    {action.proposed_content}
                  </MarkdownRenderer>
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
                  {action.status === 'approved' && action.action_kind === 'message' ? (
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
              )
            })
          )}
        </div>
        {showJumpToLatest ? (
          <button
            type="button"
            onClick={() => scrollToLatest()}
            className="btn-icon-glass bottom-spacing-4 right-spacing-4 absolute"
            aria-label="Jump to latest message"
            title="Jump to latest message"
          >
            <ArrowDown className="icon-sm" />
          </button>
        ) : null}
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
