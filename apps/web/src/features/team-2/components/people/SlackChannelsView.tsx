'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Hash, LockKeyhole } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { SLACK_PEOPLE_MESSAGES } from '../../config/messages.config'
import {
  fetchSlackChannelActivity,
  fetchSlackChannels,
  type SlackChannelActivity,
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
  const [activity, setActivity] = useState<SlackChannelActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const request = selectedChannelId
      ? fetchSlackChannelActivity(selectedChannelId).then((result) => {
          if (!cancelled) setActivity(result)
        })
      : fetchSlackChannels().then((result) => {
          if (!cancelled) setChannels(result.channels)
        })
    void request
      .catch(() => {
        if (!cancelled) {
          setError(
            selectedChannelId
              ? SLACK_PEOPLE_MESSAGES.CHANNEL_ACTIVITY_ERROR
              : SLACK_PEOPLE_MESSAGES.CHANNELS_LOAD_ERROR,
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedChannelId])

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <VibeyLoadingOrb size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <section className="surface-card border-destructive p-spacing-4 rounded-spacing-3 text-destructive border">
        {error}
      </section>
    )
  }

  if (!selectedChannelId) {
    return (
      <section className="surface-card border-border rounded-spacing-4 overflow-hidden border">
        <header className="border-border p-spacing-4 border-b">
          <h2 className="body-2 text-foreground font-semibold">PIXEL&apos;S SLACK CHANNELS</h2>
          <p className="body-4 text-muted-foreground mt-spacing-1">
            These are the channels Pixel belongs to and can observe. Open one to review its
            conversation and threads.
          </p>
        </header>
        {channels.length === 0 ? (
          <p className="body-3 text-muted-foreground p-spacing-4">
            {SLACK_PEOPLE_MESSAGES.CHANNELS_NONE}
          </p>
        ) : (
          <div className="divide-border divide-y">
            {channels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => onSelectChannel(channel.id)}
                className="hover:bg-hover-subtle p-spacing-4 gap-spacing-3 flex w-full items-center text-left transition-colors"
              >
                {channel.is_private ? (
                  <LockKeyhole className="icon-sm text-muted-foreground" />
                ) : (
                  <Hash className="icon-sm text-muted-foreground" />
                )}
                <span className="body-3 text-foreground font-medium">{channel.name}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="surface-card border-border rounded-spacing-4 flex min-h-0 flex-1 flex-col overflow-hidden border">
      <header className="border-border p-spacing-3 gap-spacing-3 flex items-center border-b">
        <button type="button" onClick={onBack} className="button-compact button-glass-neutral">
          <ArrowLeft className="icon-xs" /> Channels
        </button>
        <div className="min-w-0">
          <h2 className="body-2 text-foreground truncate font-semibold">
            #{activity?.channel.name ?? 'Slack channel'}
          </h2>
          <p className="body-4 text-muted-foreground">Slack channel conversation and threads</p>
        </div>
      </header>
      <div className="p-spacing-4 gap-spacing-3 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {(activity?.messages ?? []).length === 0 ? (
          <p className="body-3 text-muted-foreground m-auto">No visible messages yet.</p>
        ) : (
          activity?.messages.map((message) => (
            <article
              key={message.ts}
              className={
                message.direction === 'outbound'
                  ? 'surface-card border-border p-spacing-3 rounded-spacing-3 mr-auto max-w-3xl border'
                  : 'bg-secondary p-spacing-3 rounded-spacing-3 ml-auto max-w-3xl'
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
    </section>
  )
}
