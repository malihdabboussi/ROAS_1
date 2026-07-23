'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowLeft, Hash, LockKeyhole } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { SLACK_PEOPLE_MESSAGES } from '../../config/messages.config'
import { useLatestMessageScroll } from '../../hooks/use-latest-message-scroll'
import {
  fetchSlackChannelActivity,
  fetchSlackChannelCoverage,
  fetchSlackChannels,
  patchSlackChannelExclusion,
  type SlackChannelActivity,
  type SlackChannelCoverageRow,
  type SlackChannelCoverageSummary,
  type SlackChannelSummary,
} from '../../services/slack-people.service'

function slackTimestamp(ts: string): string {
  const date = new Date(Number(ts) * 1000)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
}

export function SlackChannelsView({
  selectedChannelId,
  onSelectChannel,
  onBack,
}: {
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
  onBack: () => void
}) {
  const [channels, setChannels] = useState<SlackChannelSummary[]>([])
  const [coverage, setCoverage] = useState<SlackChannelCoverageRow[]>([])
  const [summary, setSummary] = useState<SlackChannelCoverageSummary | null>(null)
  const [activity, setActivity] = useState<SlackChannelActivity | null>(null)
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activityCount = activity?.messages.length ?? 0
  const { scrollRef, handleScroll, scrollToLatest, showJumpToLatest } = useLatestMessageScroll(
    selectedChannelId ?? 'none',
    activityCount,
  )

  useEffect(() => {
    let cancelled = false
    setDirectoryLoading(true)
    setError(null)
    void Promise.all([fetchSlackChannels(), fetchSlackChannelCoverage()])
      .then(([channelResult, coverageResult]) => {
        if (cancelled) return
        setChannels(channelResult.channels)
        setCoverage(coverageResult.channels)
        setSummary(coverageResult.summary)
      })
      .catch(() => {
        if (!cancelled) setError(SLACK_PEOPLE_MESSAGES.CHANNELS_LOAD_ERROR)
      })
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedChannelId) {
      setActivity(null)
      return
    }
    let cancelled = false
    setActivityLoading(true)
    setError(null)
    void fetchSlackChannelActivity(selectedChannelId)
      .then((result) => {
        if (!cancelled) setActivity(result)
      })
      .catch(() => {
        if (!cancelled) setError(SLACK_PEOPLE_MESSAGES.CHANNEL_ACTIVITY_ERROR)
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedChannelId])

  const joinedById = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels],
  )
  const rows = coverage.length
    ? coverage
    : channels.map((channel) => ({
        channel_id: channel.id,
        channel_name: channel.name,
        is_private: channel.is_private,
        is_member: true,
        is_excluded: false,
        join_status: 'joined' as const,
        join_error: null,
        last_reconciled_at: null,
      }))

  if (directoryLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <VibeyLoadingOrb size="md" text="Loading Pixel's Slack channels..." />
      </div>
    )
  }

  return (
    <section className="surface-card border-border rounded-spacing-4 flex min-h-0 flex-1 flex-col overflow-hidden border">
      <header className="border-border p-spacing-4 border-b">
        <div className="gap-spacing-3 flex items-start">
          <button
            type="button"
            onClick={onBack}
            className="btn-icon-bare"
            aria-label="Back to People"
          >
            <ArrowLeft className="icon-sm" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="body-2 text-foreground font-semibold">PIXEL&apos;S SLACK CHANNELS</h1>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              Select a channel to review its conversation and threads. Public channels are joined
              automatically; private channels still require an invitation in Slack.
            </p>
          </div>
        </div>
        {summary ? (
          <div className="gap-spacing-2 mt-spacing-3 flex flex-wrap">
            <span className="badge-glass badge-glass-muted body-4">
              {summary.discovered} discovered
            </span>
            <span className="badge-glass badge-glass-muted body-4">{summary.joined} joined</span>
            <span className="badge-glass badge-glass-muted body-4">
              {summary.observed} observed
            </span>
            <span className="badge-glass badge-glass-muted body-4">
              {summary.excluded} excluded
            </span>
            <span className="badge-glass badge-glass-muted body-4">
              {summary.inaccessible} inaccessible
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="border-destructive text-destructive p-spacing-3 body-3 border-b">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 lg:grid-cols-3">
        <aside className="border-border flex min-h-0 flex-col border-r lg:col-span-1">
          <div className="border-border p-spacing-3 border-b">
            <h2 className="body-3 text-foreground font-semibold">Channels</h2>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              {rows.length} visible to Pixel
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="body-3 text-muted-foreground p-spacing-4">
                {SLACK_PEOPLE_MESSAGES.CHANNELS_NONE}
              </p>
            ) : (
              rows.map((channel) => {
                const selected = channel.channel_id === selectedChannelId
                return (
                  <div
                    key={channel.channel_id}
                    className={`border-border p-spacing-3 gap-spacing-2 flex items-center border-b ${
                      selected ? 'bg-secondary' : 'hover:bg-hover-subtle'
                    }`}
                  >
                    {channel.is_private ? (
                      <LockKeyhole className="icon-sm text-muted-foreground" />
                    ) : (
                      <Hash className="icon-sm text-muted-foreground" />
                    )}
                    <button
                      type="button"
                      disabled={channel.is_excluded || !joinedById.has(channel.channel_id)}
                      onClick={() => onSelectChannel(channel.channel_id)}
                      className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="body-3 text-foreground block truncate font-medium">
                        {channel.channel_name}
                      </span>
                      <span className="body-4 text-muted-foreground capitalize">
                        {channel.join_status}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="button-compact button-glass-neutral shrink-0"
                      onClick={() => {
                        void patchSlackChannelExclusion(channel.channel_id, !channel.is_excluded)
                          .then((result) => {
                            setCoverage(result.channels)
                            setSummary(result.summary)
                          })
                          .catch(() => setError(SLACK_PEOPLE_MESSAGES.CHANNEL_EXCLUSION_ERROR))
                      }}
                    >
                      {channel.is_excluded ? 'Observe' : 'Exclude'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        <div className="relative flex min-h-0 flex-col lg:col-span-2">
          {!selectedChannelId ? (
            <div className="p-spacing-6 flex flex-1 flex-col items-center justify-center text-center">
              <Hash className="icon-lg text-primary" />
              <p className="body-2 text-foreground mt-spacing-3 font-medium">
                Select a Slack channel
              </p>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                Pixel&apos;s observed messages and thread replies will appear here.
              </p>
            </div>
          ) : activityLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <VibeyLoadingOrb size="sm" text="Opening the channel conversation..." />
            </div>
          ) : (
            <>
              <div className="border-border p-spacing-3 border-b">
                <h2 className="body-2 text-foreground truncate font-semibold">
                  #{activity?.channel.name ?? 'Slack channel'}
                </h2>
                <p className="body-4 text-muted-foreground">
                  Slack channel conversation and threads
                </p>
              </div>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="p-spacing-4 gap-spacing-3 flex min-h-0 flex-1 flex-col overflow-y-auto"
              >
                {(activity?.messages ?? []).length === 0 ? (
                  <p className="body-3 text-muted-foreground m-auto">No visible messages yet.</p>
                ) : (
                  activity?.messages.map((message) => (
                    <article
                      key={message.ts}
                      className={
                        message.direction === 'outbound'
                          ? 'surface-card border-primary p-spacing-3 rounded-spacing-3 mr-spacing-8 self-start border'
                          : 'bg-secondary p-spacing-3 rounded-spacing-3 ml-spacing-8 self-end'
                      }
                    >
                      <div className="body-4 text-muted-foreground gap-spacing-2 flex items-center">
                        <span className="font-medium">{message.sender_name}</span>
                        <time>{slackTimestamp(message.ts)}</time>
                        {message.is_thread_reply ? <span>Thread reply</span> : null}
                      </div>
                      <p className="body-3 text-foreground mt-spacing-1 whitespace-pre-wrap">
                        {message.text}
                      </p>
                    </article>
                  ))
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
            </>
          )}
        </div>
      </div>
    </section>
  )
}
