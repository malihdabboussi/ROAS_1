'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Globe, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { SlackSetupDialog } from '@/features/team/components/SlackSetupDialog'
import { TelegramSetupDialog } from '@/features/team/components/TelegramSetupDialog'
import { backendGet, backendPatch } from '@/lib/api/backend-client'

interface OnboardingChannelsProps {
  onComplete: () => void
  onBack: () => void
}

export function OnboardingChannels({ onComplete, onBack }: OnboardingChannelsProps) {
  const [telegramConnected, setTelegramConnected] = useState(false)
  const [telegramBotUsername, setTelegramBotUsername] = useState('')
  const [showTelegramSetup, setShowTelegramSetup] = useState(false)
  const [slackConnected, setSlackConnected] = useState(false)
  const [slackChannelName, setSlackChannelName] = useState('')
  const [showSlackSetup, setShowSlackSetup] = useState(false)
  const [preferredChannel, setPreferredChannel] = useState<'studio' | 'telegram' | 'slack'>(
    'studio',
  )
  const [channelSaving, setChannelSaving] = useState(false)
  const channelCheckDone = useRef(false)

  useEffect(() => {
    if (channelCheckDone.current) return
    channelCheckDone.current = true
    void (async () => {
      try {
        const channels = await backendGet<
          Array<{
            channel_type: string
            provider_config?: { bot_username?: string; channel_name?: string } | null
          }>
        >('/api/telegram/channels')
        const tg = channels?.find((c) => c.channel_type === 'telegram')
        if (tg) {
          setTelegramConnected(true)
          if (tg.provider_config?.bot_username)
            setTelegramBotUsername(tg.provider_config.bot_username)
          setPreferredChannel('telegram')
        }
        const sl = channels?.find((c) => c.channel_type === 'slack')
        if (sl) {
          setSlackConnected(true)
          if (sl.provider_config?.channel_name) setSlackChannelName(sl.provider_config.channel_name)
          if (!tg) setPreferredChannel('slack')
        }
      } catch {
        // Non-blocking
      }
    })()
  }, [])

  const handleContinue = useCallback(async () => {
    setChannelSaving(true)
    try {
      await backendPatch('/api/missions/profile/settings', {
        preferred_channel: preferredChannel,
      })
      await backendPatch('/api/profile/onboarding', {
        onboarding_data: { onboarding_step: 'subscribe' },
      })
      onComplete()
    } catch {
      toast.error('Could not save communication settings')
    } finally {
      setChannelSaving(false)
    }
  }, [preferredChannel, onComplete])

  const CHANNELS = [
    {
      key: 'studio' as const,
      icon: <Globe className="size-4 text-violet-300" />,
      iconBg: 'bg-violet-900/60',
      title: 'ROAS Web App',
      titleColor: 'text-violet-400',
      description: 'Chat directly in the studio',
      enabled: true,
    },
    {
      key: 'telegram' as const,
      icon: <Send className="size-4 text-blue-300" />,
      iconBg: 'bg-blue-900/60',
      title: 'Telegram',
      titleColor: 'text-blue-400',
      description: telegramConnected ? 'Connected' : 'Connect to enable',
      enabled: telegramConnected,
    },
    {
      key: 'slack' as const,
      icon: <MessageCircle className="size-4 text-emerald-300" />,
      iconBg: 'bg-emerald-900/60',
      title: 'Slack',
      titleColor: 'text-emerald-400',
      description: slackConnected ? `#${slackChannelName || 'connected'}` : 'Connect to enable',
      enabled: slackConnected,
    },
  ] as const

  return (
    <AuthOrbShell
      showHeroOrb={false}
      showQuoteFooter={false}
      panelClassName="card-glass-full container-modal-md w-full"
      overlay={
        <>
          {showTelegramSetup && (
            <TelegramSetupDialog
              agentKey="vibey"
              agentName="ROAS"
              onClose={() => setShowTelegramSetup(false)}
              onConnected={(botUsername) => {
                setTelegramConnected(true)
                setTelegramBotUsername(botUsername)
                setPreferredChannel('telegram')
                setShowTelegramSetup(false)
              }}
            />
          )}
          {showSlackSetup && (
            <SlackSetupDialog
              agentKey="vibey"
              agentName="ROAS"
              onClose={() => setShowSlackSetup(false)}
              onConnected={(channelName) => {
                setSlackConnected(true)
                setSlackChannelName(channelName)
                setPreferredChannel('slack')
                setShowSlackSetup(false)
              }}
            />
          )}
        </>
      }
    >
      <div className="w-full">
        <div className="mb-spacing-8 text-center">
          <h2 className="title-h1 text-foreground">
            STAY CONNECTED WITH{' '}
            <span className="vibey-shine-text bg-clip-text text-transparent">VIBEY</span>
          </h2>
          <p className="title-h4 text-muted-foreground mt-spacing-2">
            Choose where ROAS reaches you.
          </p>
        </div>

        <div className="space-y-spacing-4">
          <div>
            <p className="body-3 text-muted-foreground mb-spacing-3 font-medium uppercase tracking-wide">
              Default Channel
            </p>
            <p className="body-3 text-muted-foreground/70 mb-spacing-4">
              Where ROAS sends proactive updates
            </p>
            <div className="gap-spacing-3 flex flex-col">
              {CHANNELS.map((card) => {
                const isActive = preferredChannel === card.key
                const connectAction =
                  card.key === 'telegram'
                    ? () => setShowTelegramSetup(true)
                    : card.key === 'slack'
                      ? () => setShowSlackSetup(true)
                      : null
                const connectedDetail =
                  card.key === 'telegram' && telegramBotUsername
                    ? `@${telegramBotUsername}`
                    : card.key === 'slack' && slackChannelName
                      ? `#${slackChannelName}`
                      : null
                return (
                  <div
                    key={card.key}
                    className={`relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-300 ${
                      isActive
                        ? 'chip-glass-blue scale-[1.02]'
                        : card.enabled
                          ? 'border-transparent bg-surface-subtle hover:border-border hover:bg-white/[0.04]'
                          : 'border-transparent bg-surface-subtle'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={channelSaving || !card.enabled}
                      onClick={() => card.enabled && setPreferredChannel(card.key)}
                      className="gap-spacing-3 flex min-w-0 flex-1 items-center text-left disabled:cursor-not-allowed"
                    >
                      <span
                        className={`inline-flex items-center justify-center rounded-full ${card.iconBg} p-2`}
                      >
                        {card.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`body-2 font-medium ${card.titleColor}`}>{card.title}</p>
                        <p className="body-3 text-muted-foreground">{card.description}</p>
                      </div>
                    </button>
                    {isActive && (
                      <span className="body-4 shrink-0 font-medium text-emerald-400">Default</span>
                    )}
                    {!isActive && card.enabled && connectedDetail && (
                      <span className="body-4 text-muted-foreground shrink-0 font-medium">
                        {connectedDetail}
                      </span>
                    )}
                    {!card.enabled && connectAction && (
                      <button
                        type="button"
                        onClick={connectAction}
                        className="button-glass-neutral body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 shrink-0 font-medium"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-spacing-8 gap-spacing-3 flex">
          <button
            onClick={onBack}
            className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 py-spacing-3 flex-1"
          >
            Back
          </button>
          <button
            onClick={() => void handleContinue()}
            disabled={channelSaving}
            className={`rounded-spacing-2 py-spacing-3 flex-1 font-semibold transition-all ${
              !channelSaving
                ? 'button-glass-accent'
                : 'surface-glass text-muted-foreground cursor-not-allowed opacity-50'
            }`}
          >
            <span className="relative z-10">{channelSaving ? 'Saving...' : 'Continue'}</span>
          </button>
        </div>
      </div>
    </AuthOrbShell>
  )
}
