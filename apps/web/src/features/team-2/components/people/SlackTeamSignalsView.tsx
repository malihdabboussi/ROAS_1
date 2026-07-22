'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, Eye, Radio } from 'lucide-react'
import { SLACK_PEOPLE_MESSAGES } from '../../config/messages.config'
import { slackMrkdwnToPlainPreview } from '../../lib/slack-message-markdown'
import { slackSignalEvidence } from '../../lib/slack-signal-evidence'
import type { SlackShadowAction } from '../../services/slack-people.service'

interface SlackTeamSignalsViewProps {
  actions: SlackShadowAction[]
  selectedSignalId: string | null
  onBack: () => void
  onSelectSignal: (signalId: string) => void
  onReview: (id: string, status: 'approved' | 'dismissed') => void
}

function formatListTime(timestamp: string): string {
  const ms = new Date(timestamp).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return ''
  return new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function filterTeamSignals(actions: SlackShadowAction[]): SlackShadowAction[] {
  return actions
    .filter((action) => !action.target_member_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function SlackTeamSignalsView({
  actions,
  selectedSignalId,
  onBack,
  onSelectSignal,
  onReview,
}: SlackTeamSignalsViewProps) {
  const signals = useMemo(() => filterTeamSignals(actions), [actions])
  const selected = signals.find((signal) => signal.id === selectedSignalId) ?? null
  const evidence = selected ? slackSignalEvidence(selected) : null
  const [expandedEvidence, setExpandedEvidence] = useState(false)

  return (
    <div className="gap-spacing-3 flex min-h-0 flex-1 flex-col">
      <div className="gap-spacing-3 flex shrink-0 flex-wrap items-start justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="button-compact button-glass-neutral self-start"
          >
            <ArrowLeft className="icon-xs" /> Back to People
          </button>
          <header className="mt-spacing-3">
            <p className="eyebrow text-muted-foreground">Channel-level findings</p>
            <h1 className="title-h4 text-foreground mt-spacing-1">SIGNALS</h1>
            <p className="body-3 text-muted-foreground mt-spacing-2 max-w-2xl">
              Workflow and risk findings that are not assigned to one person. Select a signal to
              review, then approve or dismiss.
            </p>
          </header>
        </div>
      </div>

      <section className="surface-card border-border rounded-spacing-4 flex min-h-0 flex-1 overflow-hidden border">
        <aside className="border-border w-spacing-80 flex min-w-0 shrink-0 flex-col border-r">
          <div className="border-border p-spacing-3 gap-spacing-2 flex shrink-0 items-center border-b">
            <Radio className="icon-sm text-muted-foreground" />
            <h2 className="body-2 text-foreground font-semibold">Team signals</h2>
            {signals.length > 0 ? (
              <span className="badge-glass badge-glass-muted body-4 ml-auto tabular-nums">
                {signals.length}
              </span>
            ) : null}
          </div>
          {signals.length === 0 ? (
            <p className="body-3 text-muted-foreground p-spacing-4">
              Channel workflow and risk findings will appear here when Pixel surfaces them.
            </p>
          ) : (
            <div className="divide-border divide-y overflow-y-auto" aria-label="Team signals">
              {signals.map((signal) => {
                const selectedRow = signal.id === selected?.id
                const needsReview = signal.status === 'proposed'
                const preview =
                  slackMrkdwnToPlainPreview(signal.proposed_content) || signal.proposed_content
                return (
                  <button
                    key={signal.id}
                    type="button"
                    aria-label={
                      needsReview
                        ? `Open team signal needing review: ${preview}`
                        : `Open team signal: ${preview}`
                    }
                    aria-current={selectedRow ? 'true' : undefined}
                    onClick={() => {
                      setExpandedEvidence(false)
                      onSelectSignal(signal.id)
                    }}
                    className={`p-spacing-3 gap-spacing-1 flex w-full flex-col text-left transition-colors ${
                      selectedRow ? 'bg-secondary' : 'hover:bg-hover-subtle hover:text-foreground'
                    }`}
                  >
                    <div className="gap-spacing-2 flex items-center justify-between">
                      <span className="gap-spacing-2 flex min-w-0 items-center">
                        {needsReview ? (
                          <span
                            className="status-dot-glass status-dot-glass-emerald shrink-0"
                            aria-hidden
                            title="Needs review"
                          />
                        ) : null}
                        <span className="body-2 text-foreground line-clamp-2 font-medium">
                          {preview}
                        </span>
                      </span>
                      <time className="body-4 text-muted-foreground shrink-0">
                        {formatListTime(signal.created_at)}
                      </time>
                    </div>
                    <div className="gap-spacing-2 mt-spacing-1 flex flex-wrap items-center">
                      <span className="badge-glass badge-glass-muted body-4 capitalize">
                        {signal.action_kind}
                      </span>
                      <span className="badge-glass badge-glass-muted body-4 capitalize">
                        {signal.status}
                      </span>
                      {needsReview ? (
                        <span className="badge-glass badge-glass-orange body-4">Needs review</span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {selected ? (
            <div className="p-spacing-4 gap-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div>
                <p className="body-4 text-muted-foreground">Selected signal</p>
                <h3 className="body-1 text-foreground mt-spacing-1 font-semibold">
                  {selected.proposed_content}
                </h3>
              </div>
              {selected.rationale ? (
                <div>
                  <p className="body-4 text-muted-foreground font-medium">Why Pixel flagged this</p>
                  <p className="body-3 text-foreground mt-spacing-1">{selected.rationale}</p>
                </div>
              ) : null}
              <div>
                <button
                  type="button"
                  className="button-compact button-glass-neutral"
                  aria-expanded={expandedEvidence}
                  aria-label={
                    expandedEvidence
                      ? SLACK_PEOPLE_MESSAGES.SIGNAL_EVIDENCE_HIDE
                      : SLACK_PEOPLE_MESSAGES.SIGNAL_EVIDENCE_SHOW
                  }
                  onClick={() => setExpandedEvidence((open) => !open)}
                >
                  <Eye className="icon-xs" />
                  {expandedEvidence ? 'Hide evidence' : 'Show evidence'}
                </button>
                {expandedEvidence && evidence ? (
                  <div className="surface-card border-border p-spacing-3 rounded-spacing-3 gap-spacing-2 mt-spacing-2 flex flex-col border">
                    <div className="gap-spacing-2 flex flex-wrap items-center">
                      <span className="body-3 text-foreground font-medium">
                        {evidence.channelName
                          ? `#${evidence.channelName}`
                          : `Slack channel ${selected.source_channel_id ?? 'unknown'}`}
                      </span>
                      {evidence.messageTime ? (
                        <time className="body-4 text-muted-foreground">{evidence.messageTime}</time>
                      ) : null}
                    </div>
                    <p className="body-4 text-muted-foreground">
                      Source:{' '}
                      {evidence.senderName ?? evidence.senderSlackUserId ?? 'Unknown person'}
                    </p>
                    {evidence.messageText ? (
                      <blockquote className="body-3 text-foreground border-border pl-spacing-3 border-l">
                        {evidence.messageText}
                      </blockquote>
                    ) : (
                      <p className="body-4 text-muted-foreground">
                        {SLACK_PEOPLE_MESSAGES.SIGNAL_EVIDENCE_OLDER}
                      </p>
                    )}
                    <div className="gap-spacing-2 flex flex-wrap items-center">
                      {evidence.confidence !== null ? (
                        <span className="badge-glass badge-glass-muted body-4">
                          {evidence.confidence}% confidence
                        </span>
                      ) : null}
                      {evidence.slackUrl ? (
                        <a
                          href={evidence.slackUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={SLACK_PEOPLE_MESSAGES.SIGNAL_EVIDENCE_OPEN_SLACK}
                          className="button-compact button-glass-neutral"
                        >
                          Open in Slack <ExternalLink className="icon-xs" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="gap-spacing-2 mt-auto flex flex-wrap items-center">
                <span className="badge-glass badge-glass-muted body-4 capitalize">
                  {selected.status}
                </span>
                {selected.status === 'proposed' ? (
                  <>
                    <button
                      type="button"
                      aria-label="Approve team signal"
                      className="button-compact button-glass-accent"
                      onClick={() => onReview(selected.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      aria-label="Dismiss team signal"
                      className="button-compact button-glass-neutral"
                      onClick={() => onReview(selected.id, 'dismissed')}
                    >
                      Dismiss
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-spacing-6 flex flex-1 flex-col items-center justify-center text-center">
              <Radio className="icon-lg text-muted-foreground" />
              <p className="body-2 text-foreground mt-spacing-3 font-medium">Select a signal</p>
              <p className="body-4 text-muted-foreground mt-spacing-1 max-w-md">
                Choose a finding from the list to read the rationale and approve or dismiss it.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
