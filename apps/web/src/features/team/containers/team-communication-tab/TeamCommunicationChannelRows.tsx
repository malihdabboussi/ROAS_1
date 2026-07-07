'use client'

import { SiTelegram } from 'react-icons/si'
import { Loader2, MessageSquare, Star, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { backendPatch } from '@/lib/api/backend-client'
import {
  disconnectSlack,
  disconnectTelegram,
  setTelegramVisibility,
  toggleSlackChannel,
  type AgentChannel,
} from '../../services/channels.service'
import { SLACK_INTEGRATION_ICON } from './team-communication-tab.constants'
import type { TeamCommunicationTabProps } from './team-communication-tab.types'

interface TeamCommunicationChannelRowsProps
  extends Pick<
    TeamCommunicationTabProps,
    | 'setChannels'
    | 'channelDisconnecting'
    | 'setChannelDisconnecting'
    | 'slackDisconnecting'
    | 'setSlackDisconnecting'
    | 'preferredChannel'
    | 'setPreferredChannel'
    | 'channelSaving'
  > {
  agentTelegram: AgentChannel | undefined
  agentSlack: AgentChannel | undefined
  isCLevel: boolean
  isReadOnly: boolean
  onPreferredChannelChange: (nextChannel: 'studio' | 'telegram' | 'slack') => Promise<void>
}

export function TeamCommunicationChannelRows({
  agentTelegram,
  agentSlack,
  isCLevel,
  isReadOnly,
  setChannels,
  channelDisconnecting,
  setChannelDisconnecting,
  slackDisconnecting,
  setSlackDisconnecting,
  preferredChannel,
  setPreferredChannel,
  channelSaving,
  onPreferredChannelChange,
}: TeamCommunicationChannelRowsProps) {
  const channelIconBtn =
    'text-muted-foreground hover:bg-hover-subtle inline-flex h-8 w-8 items-center justify-center rounded-spacing-1 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40'

  return (
    <div className="divide-border mt-spacing-2 divide-y">
      {isCLevel && (
        <div
          key="studio"
          className={`py-2.5 first:pt-0 ${!agentTelegram && !agentSlack ? 'last:pb-0' : ''}`}
        >
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <MessageSquare className="text-foreground mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="body-3 text-foreground font-medium">Team Chat</p>
                <p className="body-4 text-muted-foreground">In-app team messages</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                className={channelIconBtn}
                title="Default for proactive updates"
                disabled={isReadOnly || channelSaving}
                onClick={() => void onPreferredChannelChange('studio')}
              >
                {channelSaving ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <Star
                    className={`h-3.5 w-3.5 shrink-0 ${
                      preferredChannel === 'studio' ? 'fill-current text-status-amber' : ''
                    }`}
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {agentTelegram &&
        (() => {
          const botUsername = (agentTelegram.provider_config as Record<string, string>).bot_username
          return (
            <div
              key="tg"
              className={`py-2.5 ${!isCLevel && agentTelegram ? 'first:pt-0' : ''} ${!agentSlack && agentTelegram ? 'last:pb-0' : ''}`}
            >
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <SiTelegram className="text-foreground mt-0.5 size-5 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="body-3 text-foreground font-medium">Telegram</p>
                    <p className="body-4 text-muted-foreground flex min-w-0 items-center gap-1.5">
                      <span className="truncate">@{botUsername}</span>
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          agentTelegram.is_public ? 'bg-success' : 'bg-destructive'
                        }`}
                        title={
                          agentTelegram.is_public
                            ? 'Public — anyone can message this bot'
                            : 'Private'
                        }
                        aria-hidden
                      />
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <div className="flex items-center" title="Allow anyone on Telegram to message this bot">
                    <Switch
                      checked={agentTelegram.is_public ?? false}
                      disabled={isReadOnly}
                      onCheckedChange={async (val) => {
                        setChannels((prev) =>
                          prev.map((c) =>
                            c.id === agentTelegram.id ? { ...c, is_public: val } : c,
                          ),
                        )
                        await setTelegramVisibility(agentTelegram.agent_key, val).catch(() => {
                          setChannels((prev) =>
                            prev.map((c) =>
                              c.id === agentTelegram.id ? { ...c, is_public: !val } : c,
                            ),
                          )
                        })
                      }}
                    />
                  </div>
                  {isCLevel && (
                    <button
                      type="button"
                      className={channelIconBtn}
                      title="Default for proactive updates"
                      disabled={isReadOnly || channelSaving}
                      onClick={() => void onPreferredChannelChange('telegram')}
                    >
                      {channelSaving ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Star
                          className={`h-3.5 w-3.5 shrink-0 ${
                            preferredChannel === 'telegram'
                              ? 'fill-current text-status-amber'
                              : ''
                          }`}
                        />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${channelIconBtn} text-destructive hover:bg-destructive/10 hover:text-destructive`}
                    title="Disconnect"
                    disabled={isReadOnly || channelDisconnecting}
                    onClick={async () => {
                      setChannelDisconnecting(true)
                      try {
                        await disconnectTelegram(agentTelegram.agent_key)
                        setChannels((prev) => prev.filter((c) => c.id !== agentTelegram.id))
                        if (preferredChannel === 'telegram') {
                          setPreferredChannel('studio')
                          await backendPatch('/api/missions/profile/settings', {
                            preferred_channel: 'studio',
                          })
                        }
                      } finally {
                        setChannelDisconnecting(false)
                      }
                    }}
                  >
                    {channelDisconnecting ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
              {agentTelegram.error_message && (
                <p className="body-4 mt-spacing-1 text-destructive">
                  {agentTelegram.error_message}
                </p>
              )}
            </div>
          )
        })()}

      {agentSlack &&
        (() => {
          const channelName = (agentSlack.provider_config as Record<string, string>).channel_name
          return (
            <div
              key="slack"
              className={`py-2.5 last:pb-0 ${!isCLevel && !agentTelegram && agentSlack ? 'first:pt-0' : ''}`}
            >
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <img
                    src={SLACK_INTEGRATION_ICON}
                    alt=""
                    className="mt-0.5 size-5 shrink-0 object-contain"
                    width={20}
                    height={20}
                  />
                  <div className="min-w-0">
                    <p className="body-3 text-foreground font-medium">Slack</p>
                    <p className="body-4 text-muted-foreground flex min-w-0 items-center gap-1.5">
                      <span className="truncate">#{channelName}</span>
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          agentSlack.is_active ? 'bg-success' : 'bg-destructive'
                        }`}
                        title={
                          agentSlack.is_active ? 'Active — posting to this channel' : 'Inactive'
                        }
                        aria-hidden
                      />
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <div className="flex items-center" title="Post to Slack channel">
                    <Switch
                      checked={agentSlack.is_active}
                      disabled={isReadOnly}
                      onCheckedChange={async (val) => {
                        setChannels((prev) =>
                          prev.map((c) =>
                            c.id === agentSlack.id ? { ...c, is_active: val } : c,
                          ),
                        )
                        await toggleSlackChannel(agentSlack.agent_key, val).catch(() => {
                          setChannels((prev) =>
                            prev.map((c) =>
                              c.id === agentSlack.id ? { ...c, is_active: !val } : c,
                            ),
                          )
                        })
                      }}
                    />
                  </div>
                  {isCLevel && (
                    <button
                      type="button"
                      className={channelIconBtn}
                      title="Default for proactive updates"
                      disabled={isReadOnly || channelSaving}
                      onClick={() => void onPreferredChannelChange('slack')}
                    >
                      {channelSaving ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Star
                          className={`h-3.5 w-3.5 shrink-0 ${
                            preferredChannel === 'slack' ? 'fill-current text-status-amber' : ''
                          }`}
                        />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${channelIconBtn} text-destructive hover:bg-destructive/10 hover:text-destructive`}
                    title="Disconnect"
                    disabled={isReadOnly || slackDisconnecting}
                    onClick={async () => {
                      setSlackDisconnecting(true)
                      try {
                        await disconnectSlack(agentSlack.agent_key)
                        setChannels((prev) => prev.filter((c) => c.id !== agentSlack.id))
                        if (preferredChannel === 'slack') {
                          setPreferredChannel('studio')
                          await backendPatch('/api/missions/profile/settings', {
                            preferred_channel: 'studio',
                          })
                        }
                      } finally {
                        setSlackDisconnecting(false)
                      }
                    }}
                  >
                    {slackDisconnecting ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
              {agentSlack.error_message && (
                <p className="body-4 mt-spacing-1 text-destructive">{agentSlack.error_message}</p>
              )}
            </div>
          )
        })()}
    </div>
  )
}
