'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { Brain, MessageSquare, PanelRightOpen, Search, X } from 'lucide-react'
import { ConversationChannelIcon } from '@/components/chat/ConversationChannelIcon'
import type { MissionAgent } from '@/features/mission-control/types'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { STATUS_BADGES } from '../../constants/team.constants'
import { RoleEmblem } from '../RoleEmblem'

interface TeamChatMobileThreadHeaderProps {
  agent: MissionAgent
  sessionTitle: string
  onOpenConversations: () => void
  onAgentTitleClick: () => void
  searchOpen: boolean
  onSearchOpenChange: (open: boolean) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  activeCampaignId: string | null
  campaignPanelOpen: boolean
  onCampaignPanelToggle: () => void
}

export function TeamChatMobileThreadHeader({
  agent,
  sessionTitle,
  onOpenConversations,
  onAgentTitleClick,
  searchOpen,
  onSearchOpenChange,
  searchQuery,
  onSearchQueryChange,
  activeCampaignId,
  campaignPanelOpen,
  onCampaignPanelToggle,
}: TeamChatMobileThreadHeaderProps) {
  const openAgentBrainTab = useCallback(() => {
    const scope = `agent:${agent.agent_key}`
    const url = `/brain?scope=${encodeURIComponent(scope)}`
    openInNewTab(url)
  }, [agent.agent_key])

  const showCampaignButton = Boolean(activeCampaignId && !campaignPanelOpen)

  return (
    <div className="relative shrink-0 md:hidden">
      <div className="flex items-center gap-3 px-3 pb-1 pt-3">
        <button
          type="button"
          onClick={onOpenConversations}
          className="chip-glass-neutral h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg"
          aria-label="Conversations"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        {searchOpen ? (
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search..."
            className="input-glass body-3 text-foreground rounded-spacing-2 px-spacing-3 py-spacing-2 min-w-0 flex-1"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={onAgentTitleClick}
            className="body-2 text-foreground min-w-0 flex-1 truncate text-center font-medium"
          >
            {sessionTitle}
          </button>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onSearchOpenChange(!searchOpen)}
            className={`btn-icon-glass rounded-spacing-2 ${searchOpen ? 'btn-icon-glass--active' : ''}`}
            aria-label={searchOpen ? 'Close search' : 'Search in conversation'}
            title="Search"
          >
            {searchOpen ? <X className="icon-sm" /> : <Search className="icon-sm" />}
          </button>
          <button
            type="button"
            onClick={openAgentBrainTab}
            className="btn-icon-glass rounded-spacing-2"
            aria-label="Open agent brain in new tab"
            title="Agent brain"
          >
            <Brain className="icon-sm" />
          </button>
          {showCampaignButton ? (
            <button
              type="button"
              onClick={onCampaignPanelToggle}
              className="btn-icon-glass rounded-spacing-2"
              aria-label="Open campaign panel"
              title="Campaign preview"
            >
              <PanelRightOpen className="icon-sm" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-[var(--color-background)] to-transparent" />
    </div>
  )
}

interface TeamChatHeaderProps {
  leadingSlot?: React.ReactNode
  agent: MissionAgent
  statusBadgeText: string | null
  sessionMetadata?: Record<string, unknown> | null
  sessionTitle: string
  onAgentHeaderClick: () => void
  campaignPanelOpen: boolean
  onCampaignPanelToggle: () => void
  searchOpen: boolean
  onSearchOpenChange: (open: boolean) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  activeCampaignId: string | null
}

export function TeamChatHeader({
  leadingSlot,
  agent,
  statusBadgeText,
  sessionMetadata,
  sessionTitle,
  onAgentHeaderClick,
  campaignPanelOpen,
  onCampaignPanelToggle,
  searchOpen,
  onSearchOpenChange,
  searchQuery,
  onSearchQueryChange,
  activeCampaignId,
}: TeamChatHeaderProps) {
  const openAgentBrainTab = useCallback(() => {
    const scope = `agent:${agent.agent_key}`
    const url = `/brain?scope=${encodeURIComponent(scope)}`
    openInNewTab(url)
  }, [agent.agent_key])

  return (
    <div className="relative shrink-0 px-4 md:px-8">
      <div className="mx-auto w-full max-w-3xl py-1">
        <div
          role="button"
          tabIndex={0}
          onClick={onAgentHeaderClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onAgentHeaderClick()
          }}
          className="rounded-spacing-2 p-spacing-1 hover:bg-hover-subtle flex w-full cursor-pointer items-start gap-3 text-left transition-colors"
        >
          {leadingSlot}
          {agent.image_url ? (
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface-subtle">
              <img src={agent.image_url} alt="" className="h-full w-full object-cover object-top" />
            </div>
          ) : (
            <RoleEmblem roleKey={agent.agent_key} size="sm" />
          )}
          <div className="min-w-0 flex-1">
            <div className="body-2 text-foreground flex min-w-0 flex-wrap items-center gap-2 font-semibold uppercase leading-tight">
              <span className="min-w-0 truncate">{agent.name}</span>
              {statusBadgeText ? (
                <span
                  className={`${STATUS_BADGES[agent.status] ?? STATUS_BADGES['offline']} badge-glass-sm shrink-0 normal-case`}
                >
                  {statusBadgeText}
                </span>
              ) : null}
            </div>
            <div className="body-4 text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
              <ConversationChannelIcon metadata={sessionMetadata} />
              <span className="truncate">{sessionTitle}</span>
            </div>
          </div>

          <div
            className="gap-spacing-1 flex shrink-0 items-start"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={false}
              animate={{ width: searchOpen ? 180 : 0, opacity: searchOpen ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="shrink-0 overflow-hidden"
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Search..."
                className="input-glass body-4 h-spacing-8 rounded-spacing-2 px-spacing-3 py-spacing-1 w-[180px] shrink-0"
                autoFocus={searchOpen}
              />
            </motion.div>
            <button
              type="button"
              onClick={() => onSearchOpenChange(!searchOpen)}
              className={`btn-icon-glass rounded-spacing-2 ${searchOpen ? 'btn-icon-glass--active' : ''}`}
              aria-label={searchOpen ? 'Close search' : 'Search in conversation'}
              title="Search"
            >
              {searchOpen ? <X className="icon-sm" /> : <Search className="icon-sm" />}
            </button>
            <button
              type="button"
              onClick={openAgentBrainTab}
              className="btn-icon-glass rounded-spacing-2"
              aria-label="Open agent brain in new tab"
              title="Agent brain"
            >
              <Brain className="icon-sm" />
            </button>
            {activeCampaignId && !campaignPanelOpen && (
              <button
                type="button"
                onClick={onCampaignPanelToggle}
                className="btn-icon-glass rounded-spacing-2"
                aria-label="Open campaign panel"
                title="Campaign preview"
              >
                <PanelRightOpen className="icon-sm" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-[var(--color-background)] to-transparent" />
    </div>
  )
}
