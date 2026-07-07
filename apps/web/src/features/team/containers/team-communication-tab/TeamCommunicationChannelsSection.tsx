'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SiTelegram } from 'react-icons/si'
import { Plus } from 'lucide-react'
import { backendPatch } from '@/lib/api/backend-client'
import { clampDropdownLeft } from '../../lib/clamp-dropdown-left'
import { CommsSectionHeader } from './CommsSectionHeader'
import { TeamCommunicationChannelRows } from './TeamCommunicationChannelRows'
import { SLACK_INTEGRATION_ICON } from './team-communication-tab.constants'
import type { TeamCommunicationTabProps } from './team-communication-tab.types'

interface TeamCommunicationChannelsSectionProps
  extends Pick<
    TeamCommunicationTabProps,
    | 'channelsLoading'
    | 'channels'
    | 'setChannels'
    | 'channelDisconnecting'
    | 'setChannelDisconnecting'
    | 'slackDisconnecting'
    | 'setSlackDisconnecting'
    | 'setShowTelegramSetup'
    | 'setShowSlackSetup'
    | 'preferredChannel'
    | 'setPreferredChannel'
    | 'channelSaving'
    | 'setChannelSaving'
  > {
  selected: NonNullable<TeamCommunicationTabProps['selected']>
  collapsed: boolean
  onToggle: () => void
  isReadOnly: boolean
}

export function TeamCommunicationChannelsSection({
  selected,
  channelsLoading,
  channels,
  setChannels,
  channelDisconnecting,
  setChannelDisconnecting,
  slackDisconnecting,
  setSlackDisconnecting,
  setShowTelegramSetup,
  setShowSlackSetup,
  preferredChannel,
  setPreferredChannel,
  channelSaving,
  setChannelSaving,
  collapsed,
  onToggle,
  isReadOnly,
}: TeamCommunicationChannelsSectionProps) {
  const [addChannelOpen, setAddChannelOpen] = useState(false)
  const addChannelRef = useRef<HTMLDivElement>(null)
  const addChannelBtnRef = useRef<HTMLButtonElement>(null)
  const [addChannelPos, setAddChannelPos] = useState({ top: 0, left: 0, width: 0 })

  const agentKey = selected.agent_key ?? ''
  const hasTelegram = channels.some(
    (c) => c.agent_key === agentKey && c.channel_type === 'telegram',
  )
  const hasSlack = channels.some((c) => c.agent_key === agentKey && c.channel_type === 'slack')
  const canAddChannel = !isReadOnly && (!hasTelegram || !hasSlack)
  const isCLevel = selected.level === 'c_level'
  const agentTelegram = channels.find(
    (c) => c.agent_key === agentKey && c.channel_type === 'telegram',
  )
  const agentSlack = channels.find((c) => c.agent_key === agentKey && c.channel_type === 'slack')

  useLayoutEffect(() => {
    if (!addChannelOpen || !addChannelBtnRef.current) return
    const rect = addChannelBtnRef.current.getBoundingClientRect()
    const width = Math.max(rect.width, 224)
    setAddChannelPos({
      top: rect.bottom + 4,
      left: clampDropdownLeft(rect.left, width),
      width,
    })
  }, [addChannelOpen])

  useEffect(() => {
    if (!addChannelOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        addChannelRef.current &&
        !addChannelRef.current.contains(target) &&
        !target.closest('[data-add-channel-portal]') &&
        !addChannelBtnRef.current?.contains(target)
      ) {
        setAddChannelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [addChannelOpen])

  const handlePreferredChannel = async (nextChannel: 'studio' | 'telegram' | 'slack') => {
    if (preferredChannel === nextChannel) return
    const previous = preferredChannel
    setPreferredChannel(nextChannel)
    setChannelSaving(true)
    await backendPatch('/api/missions/profile/settings', {
      preferred_channel: nextChannel,
    }).catch(() => setPreferredChannel(previous))
    setChannelSaving(false)
  }

  return (
    <>
      <CommsSectionHeader
        title="Channels"
        collapsed={collapsed}
        onToggle={onToggle}
        first={false}
        trailing={
          canAddChannel && !channelsLoading ? (
            <div ref={addChannelRef} className="relative shrink-0">
              <button
                ref={addChannelBtnRef}
                type="button"
                onClick={() => setAddChannelOpen((o) => !o)}
                className="text-muted-foreground hover:bg-hover-subtle rounded-spacing-1 hover:text-foreground inline-flex h-8 w-8 items-center justify-center transition-colors"
                aria-label="Add channel"
                title="Add channel"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </button>
              {addChannelOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    data-add-channel-portal
                    className="z-dropdown rounded-spacing-2 fixed shadow-lg"
                    style={{
                      top: addChannelPos.top,
                      left: addChannelPos.left,
                      width: addChannelPos.width,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div
                      className="dropdown-menu-solid rounded-spacing-2 p-spacing-2"
                      style={{ scrollbarWidth: 'none' }}
                    >
                      {!hasTelegram && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddChannelOpen(false)
                            setShowTelegramSetup(true)
                          }}
                          className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center text-left transition-colors"
                        >
                          <SiTelegram className="size-5 shrink-0" aria-hidden />
                          <span className="min-w-0 truncate">Telegram</span>
                        </button>
                      )}
                      {!hasSlack && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddChannelOpen(false)
                            setShowSlackSetup(true)
                          }}
                          className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center text-left transition-colors"
                        >
                          <img
                            src={SLACK_INTEGRATION_ICON}
                            alt=""
                            className="size-5 shrink-0 object-contain"
                            width={20}
                            height={20}
                          />
                          <span className="min-w-0 truncate">Slack</span>
                        </button>
                      )}
                    </div>
                  </div>,
                  document.body,
                )}
            </div>
          ) : null
        }
      />
      {!collapsed ? (
        <div className="px-spacing-2 pb-spacing-1">
          {channelsLoading ? (
            <p className="body-4 text-muted-foreground">Loading channels...</p>
          ) : !isCLevel && !agentTelegram && !agentSlack ? null : (
            <TeamCommunicationChannelRows
              agentTelegram={agentTelegram}
              agentSlack={agentSlack}
              isCLevel={isCLevel}
              isReadOnly={isReadOnly}
              setChannels={setChannels}
              channelDisconnecting={channelDisconnecting}
              setChannelDisconnecting={setChannelDisconnecting}
              slackDisconnecting={slackDisconnecting}
              setSlackDisconnecting={setSlackDisconnecting}
              preferredChannel={preferredChannel}
              setPreferredChannel={setPreferredChannel}
              channelSaving={channelSaving}
              onPreferredChannelChange={handlePreferredChannel}
            />
          )}
        </div>
      ) : null}
    </>
  )
}
