'use client'

import { motion } from 'framer-motion'
import { Loader2, PanelLeftOpen, Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

const COLLAPSED_SLIDE_EASE = [0.32, 0.72, 0, 1] as const
const COLLAPSED_SLIDE_DURATION = 0.24

export interface TeamConversationsSidebarCollapsedRailProps {
  creatingSession: boolean
  onExpandedChange: (expanded: boolean) => void
  onNewConversation: () => void
}

export function TeamConversationsSidebarCollapsedRail({
  creatingSession,
  onExpandedChange,
  onNewConversation,
}: TeamConversationsSidebarCollapsedRailProps) {
  return (
    <motion.div
      key="collapsed"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: COLLAPSED_SLIDE_DURATION, ease: COLLAPSED_SLIDE_EASE }}
      className="gap-spacing-3 px-spacing-2 py-spacing-3 flex min-h-0 flex-1 flex-col items-center overflow-hidden"
    >
      <span className="typo-2xs text-muted-foreground leading-tight">Conversations</span>
      <Tooltip label="Expand conversations" side="right">
        <button
          type="button"
          onClick={() => onExpandedChange(true)}
          className="team-conv-inline-icon-btn"
          aria-label="Expand conversations"
        >
          <PanelLeftOpen className="icon-sm" />
        </button>
      </Tooltip>
      <Tooltip label="New conversation" side="right">
        <button
          type="button"
          onClick={() => void onNewConversation()}
          disabled={creatingSession}
          className="nav-glass-emerald rounded-spacing-2 h-spacing-6 w-spacing-6 flex items-center justify-center disabled:opacity-50"
          aria-label="New conversation"
        >
          {creatingSession ? (
            <Loader2 className="icon-sm animate-spin" />
          ) : (
            <Plus className="icon-sm" />
          )}
        </button>
      </Tooltip>
    </motion.div>
  )
}
