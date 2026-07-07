'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box,
  CalendarClock,
  Check,
  ChevronRight,
  Folder,
  GitBranch,
  LayoutDashboard,
  PanelRightOpen,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { useCampaignMode } from '../../contexts/CampaignModeContext'
import { renameConversation } from '../../services/chat.service'
import { useChatStore } from '../../store/use-chat-store'
import type { TabType } from '../../types/studio.types'

const TAB_ICONS: Record<TabType, React.ReactNode> = {
  artifacts: <Box className="h-4 w-4" />,
  workflow: <GitBranch className="h-4 w-4" />,
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  leads: <Users className="h-4 w-4" />,
  media: <Folder className="h-4 w-4" />,
  schedule: <CalendarClock className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
}

const ALL_TABS: TabType[] = [
  'artifacts',
  // 'workflow',
  'dashboard',
  'leads',
  'media',
  'schedule',
  'settings',
]

export function StudioHeaderBar() {
  const {
    activeCampaignId,
    activeCampaignName,
    isPanelMinimized,
    isPanelExpanded,
    hasSocialContent,
    expandPanel,
  } = useCampaignMode()

  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const conversations = useChatStore((s) => s.conversations)
  const updateConversation = useChatStore((s) => s.updateConversation)
  const hasUnreadArtifacts = useChatStore((s) => s.hasUnreadArtifacts)

  const activeConv = conversations.find((c) => c.id === activeConversationId)
  const title = activeConv?.title ?? null

  const hasCampaign = activeCampaignId !== null

  // ── Compact mode: collapse tab icons when header is too narrow ─────
  const [isCompact, setIsCompact] = useState(false)
  const headerRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = headerRowRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setIsCompact(width < 640)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ── Inline rename state ──────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleStartEdit = useCallback(() => {
    if (!title) return
    setEditValue(title)
    setIsEditing(true)
  }, [title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSubmitRename = useCallback(async () => {
    const trimmed = editValue.trim()
    if (!trimmed || !activeConversationId || activeConversationId.startsWith('pending-')) {
      setIsEditing(false)
      return
    }
    await renameConversation(activeConversationId, trimmed)
    updateConversation(activeConversationId, { title: trimmed })
    setIsEditing(false)
  }, [editValue, activeConversationId, updateConversation])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditValue('')
  }, [])

  // When preview panel is open, hide header so sticky user messages
  // align with the preview toolbar icons (both at 16px from top)
  if (isPanelExpanded) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0">
      {/* Content Row — positioned at 16px from top to align with sticky messages & preview icons */}
      <div ref={headerRowRef} className="flex w-full items-center justify-between px-4 pt-4">
        {/* Left: Breadcrumbs */}
        <div className="pointer-events-auto flex min-w-0 max-w-[240px] items-center gap-1 overflow-hidden">
          {hasCampaign && (
            <span className="body-3 text-muted-foreground min-w-0 max-w-[96px] truncate">
              {activeCampaignName ?? 'Campaign'}
            </span>
          )}

          {/* Conversation title */}
          {title && (
            <>
              {hasCampaign && (
                <ChevronRight className="text-muted-foreground/50 h-3.5 w-3.5 flex-shrink-0" />
              )}
              {isEditing ? (
                <div className="flex items-center gap-0.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSubmitRename()
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    className="input-glass body-3 max-w-[96px] truncate rounded px-2 py-0.5"
                  />
                  <button
                    onClick={() => void handleSubmitRename()}
                    className="text-primary hover:bg-secondary flex h-5 w-5 items-center justify-center rounded"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-muted-foreground hover:bg-secondary flex h-5 w-5 items-center justify-center rounded"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="body-3 text-foreground hover:text-primary min-w-0 max-w-[120px] truncate transition-colors"
                  title="Click to rename"
                >
                  {title}
                </button>
              )}
            </>
          )}
        </div>

        {/* Right: Minimized tab icons (full) or single expand button (compact) */}
        {hasCampaign &&
          isPanelMinimized &&
          (isCompact ? (
            <div className="pointer-events-auto ml-auto flex-shrink-0 py-1 pl-4">
              <button
                type="button"
                data-tooltip="Open Campaign"
                data-side="bottom"
                className="tooltip p-spacing-2 rounded-spacing-2 chip-glass-neutral hover:chip-glass-blue relative shadow-lg transition-all"
                onClick={() => {
                  expandPanel('artifacts')
                  useChatStore.getState().clearUnreadArtifacts()
                }}
              >
                <PanelRightOpen className="h-4 w-4" />
                {hasUnreadArtifacts && (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                )}
              </button>
            </div>
          ) : (
            <div className="gap-spacing-1 pointer-events-auto ml-auto flex flex-shrink-0 items-center py-1 pl-4">
              {ALL_TABS.filter((t) => t !== 'schedule' || hasSocialContent).map((tabId) => (
                <button
                  key={tabId}
                  type="button"
                  data-tooltip={tabId.charAt(0).toUpperCase() + tabId.slice(1)}
                  data-side="bottom"
                  className="tooltip p-spacing-2 rounded-spacing-2 chip-glass-neutral hover:chip-glass-blue relative shadow-lg transition-all"
                  onClick={() => {
                    expandPanel(tabId)
                    if (tabId === 'artifacts') useChatStore.getState().clearUnreadArtifacts()
                  }}
                >
                  {TAB_ICONS[tabId]}
                  {tabId === 'artifacts' && hasUnreadArtifacts && (
                    <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                  )}
                </button>
              ))}
            </div>
          ))}
      </div>
    </div>
  )
}
