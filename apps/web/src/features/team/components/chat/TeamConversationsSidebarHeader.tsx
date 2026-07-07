'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { PanelLeftClose, Plus, Search, User, Users, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

export interface TeamConversationsSidebarHeaderProps {
  convoMenuHot: boolean
  hasPeerConversations: boolean
  mobilePageLayout: boolean
  searchQuery: string
  showAllOrgConversations: boolean
  onClearSearch: () => void
  onExpandedChange: (expanded: boolean) => void
  onMobileGoToTeamRoster?: () => void
  onNewCampaign: () => void
  onSearchQueryChange: (query: string) => void
  onShowAllOrgConversationsChange?: (show: boolean) => void
}

function ConversationScopeButton({
  hasPeerConversations,
  showAllOrgConversations,
  onShowAllOrgConversationsChange,
}: {
  hasPeerConversations: boolean
  showAllOrgConversations: boolean
  onShowAllOrgConversationsChange?: (show: boolean) => void
}) {
  if (!onShowAllOrgConversationsChange) return null

  return (
    <Tooltip
      label={
        !hasPeerConversations
          ? 'All conversations here are yours — nothing to filter yet'
          : showAllOrgConversations
            ? 'Show only mine'
            : 'Show all'
      }
      side="bottom"
    >
      <button
        type="button"
        disabled={!hasPeerConversations}
        onClick={() => {
          if (!hasPeerConversations) return
          onShowAllOrgConversationsChange(!showAllOrgConversations)
        }}
        className="team-conv-inline-icon-btn"
        aria-label={
          !hasPeerConversations
            ? 'All conversations here are yours'
            : showAllOrgConversations
              ? 'Show only my conversations'
              : 'Show all org conversations'
        }
      >
        {showAllOrgConversations ? (
          <Users className="icon-sm" />
        ) : (
          <User className="icon-sm" />
        )}
      </button>
    </Tooltip>
  )
}

export function TeamConversationsSidebarHeader({
  convoMenuHot,
  hasPeerConversations,
  mobilePageLayout,
  onClearSearch,
  onExpandedChange,
  onMobileGoToTeamRoster,
  onNewCampaign,
  onSearchQueryChange,
  onShowAllOrgConversationsChange,
  searchQuery,
  showAllOrgConversations,
}: TeamConversationsSidebarHeaderProps) {
  return (
    <>
      {mobilePageLayout ? (
        <div className="border-border gap-spacing-3 pb-spacing-3 flex shrink-0 items-center border-b">
          <Tooltip label="Team" side="bottom">
            <button
              type="button"
              onClick={() => {
                if (onMobileGoToTeamRoster) onMobileGoToTeamRoster()
                else window.dispatchEvent(new Event('toggle-mobile-sidebar'))
              }}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg"
              aria-label="Back to team"
            >
              <Users className="h-4 w-4" />
            </button>
          </Tooltip>
          <span className="body-2 text-foreground min-w-0 flex-1 truncate text-center font-medium">
            Conversations
          </span>
          <div className="gap-spacing-1 flex shrink-0 items-center">
            <ConversationScopeButton
              hasPeerConversations={hasPeerConversations}
              showAllOrgConversations={showAllOrgConversations}
              onShowAllOrgConversationsChange={onShowAllOrgConversationsChange}
            />
            <Tooltip label="New campaign" side="bottom">
              <button
                type="button"
                onClick={onNewCampaign}
                className="chip-glass-neutral h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg"
                aria-label="New campaign"
              >
                <Plus className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      ) : (
        <div className="border-border gap-spacing-2 pb-spacing-3 flex shrink-0 items-center justify-between border-b">
          <p className="body-2 text-foreground min-w-0 truncate font-semibold uppercase tracking-wide">
            Conversations
          </p>
          <div className="flex min-h-[22px] min-w-20 shrink-0 items-center justify-end">
            <AnimatePresence initial={false}>
              {convoMenuHot ? (
                <motion.div
                  key="convo-header-actions"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="flex items-center gap-1"
                >
                  <ConversationScopeButton
                    hasPeerConversations={hasPeerConversations}
                    showAllOrgConversations={showAllOrgConversations}
                    onShowAllOrgConversationsChange={onShowAllOrgConversationsChange}
                  />
                  <Tooltip label="Collapse" side="bottom">
                    <button
                      type="button"
                      onClick={() => onExpandedChange(false)}
                      className="team-conv-inline-icon-btn"
                      aria-label="Collapse conversations"
                    >
                      <PanelLeftClose className="icon-sm" />
                    </button>
                  </Tooltip>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="pt-spacing-3 gap-spacing-2 flex shrink-0 flex-col">
        <div className="input-glass gap-spacing-2 rounded-spacing-2 px-spacing-3 h-spacing-8 flex w-full shrink-0 items-center py-0">
          <Search className="icon-xs text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search conversations…"
            className="body-3 text-foreground placeholder:text-muted-foreground min-h-0 min-w-0 flex-1 bg-transparent leading-none focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Clear search"
            >
              <X className="icon-xs shrink-0" />
            </button>
          ) : null}
        </div>
      </div>
    </>
  )
}
