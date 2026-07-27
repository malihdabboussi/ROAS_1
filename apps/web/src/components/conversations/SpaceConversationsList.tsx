'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MessageSquare } from 'lucide-react'
import {
  getConversationAgentDisplay,
  groupConversationsForHistory,
  stripLegacySpacesConversationTitle,
  type ChatHistoryGroupBy,
  type ChatHistoryLeadingIcon,
  type Conversation,
  type ConversationAgentDisplay,
} from '@/lib/conversations'
import { SpaceConversationActionsSurface } from './SpaceConversationActionsSurface'
import { SpaceConversationRow, type ConversationRowRuntimeState } from './SpaceConversationRows'
import { SpaceConversationSections } from './SpaceConversationSections'
import { SpaceConversationsHeader } from './SpaceConversationsHeader'

export interface SpaceConversationsListProps {
  conversations: Conversation[]
  conversationRuntimeById?: Partial<Record<string, ConversationRowRuntimeState>>
  selectedConversationId: string | null
  query: string
  onQueryChange: (query: string) => void
  onSelectConversation: (conversationId: string) => void
  onNewConversation: () => void
  onDeleteConversation: (conversationId: string) => void
  onRenameConversation: (conversationId: string, title: string) => void | Promise<void>
  onTogglePinConversation: (conversationId: string, pinned: boolean) => void | Promise<void>
  onToggleArchiveConversation: (conversationId: string, archived: boolean) => void | Promise<void>
  onMoveConversation: (conversationId: string, campaignId: string | null) => void | Promise<void>
  onDuplicateConversation: (
    conversationId: string,
    campaignId?: string | null,
  ) => void | Promise<void>
  onCopyConversationLink: (conversationId: string) => void
  onCopyConversationId?: (conversationId: string) => void
  onOpenConversationInNewTab?: (conversationId: string) => void
  onShareConversation: (conversation: Conversation) => void
  onBack: () => void
  loading?: boolean
  /** When true, hide the back arrow (e.g. sidebar embedded beside chat). */
  hideBackButton?: boolean
  /** When true, no border under the search / New row (Team 2 sidebar). Spaces keeps the default divider. */
  hideHeaderBottomBorder?: boolean
  /** Opt into the compact icon header used by embedded agent sidebars. */
  compactHeader?: boolean
  /**
   * When true, parent owns width transition + rail swap (see SpacesContainer / Team agent chat).
   * `collapsed` is only used to reset menus/search while the parent panel is collapsed.
   */
  parentControlsCollapse?: boolean
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Opens compact search after parent expands the sidebar (rail search button). */
  openCompactSearch?: boolean
  onOpenCompactSearchConsumed?: () => void
  /** Hide org-only actions like Copy link in personal accounts. */
  isOrgContext: boolean
  /** Enables the all-agent conversation toggle in the header. */
  showAllAgentsToggle?: boolean
  /** When true, rows show the source agent avatar and search includes agent names. */
  allAgentsMode?: boolean
  onAllAgentsModeChange?: (enabled: boolean) => void
  /** Leading mark on each row (agent / logo / status / none). Overrides allAgentsMode avatar. */
  leadingIcon?: ChatHistoryLeadingIcon
  agentByKey?: Record<string, ConversationAgentDisplay>
  hideNewButton?: boolean
  /** Render New as a full-width control under the search/filter toolbar. */
  newButtonBelowSearch?: boolean
  /** When true, omit the inline list search (caller owns search UI). */
  hideSearch?: boolean
  /** Parent-owned search control shown after agent/filter when `hideSearch` is true. */
  searchSlot?: ReactNode
  headerEndSlot?: ReactNode
  /** Active query constraints rendered immediately below the New chat control. */
  headerFooterSlot?: ReactNode
  /** Claude-style list organization. Default: flat (none). */
  groupBy?: ChatHistoryGroupBy
  campaignNameById?: Record<string, string>
  headerStartSlot?: ReactNode
  /** Show a compact updated date at the end of each row. */
  showUpdatedAt?: boolean
  /** Separate rows with a subtle rule instead of card spacing. */
  dividedRows?: boolean
}

const INITIAL_SECTION_VISIBLE = 6
const SECTION_VISIBLE_INCREMENT = 6

export function SpaceConversationsList({
  conversations,
  conversationRuntimeById,
  selectedConversationId,
  query,
  onQueryChange,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  onToggleArchiveConversation,
  onMoveConversation,
  onDuplicateConversation,
  onCopyConversationLink,
  onCopyConversationId,
  onOpenConversationInNewTab,
  onShareConversation,
  onBack,
  loading,
  hideBackButton,
  hideHeaderBottomBorder,
  compactHeader,
  parentControlsCollapse,
  collapsed,
  onCollapsedChange,
  openCompactSearch,
  onOpenCompactSearchConsumed,
  isOrgContext,
  showAllAgentsToggle,
  allAgentsMode,
  onAllAgentsModeChange,
  leadingIcon,
  agentByKey,
  hideNewButton,
  newButtonBelowSearch,
  hideSearch,
  searchSlot,
  headerEndSlot,
  headerFooterSlot,
  headerStartSlot,
  groupBy = 'none',
  campaignNameById,
  showUpdatedAt,
  dividedRows,
}: SpaceConversationsListProps) {
  const [menuConversationId, setMenuConversationId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [compactSearchOpen, setCompactSearchOpen] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [sectionCollapsed, setSectionCollapsed] = useState<Partial<Record<string, boolean>>>({})
  const [sectionVisibleRows, setSectionVisibleRows] = useState<Partial<Record<string, number>>>({})

  useEffect(() => {
    if (renameId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renameId])

  const q = query.trim().toLowerCase()
  const includeAgentInSearch = Boolean(allAgentsMode) || leadingIcon === 'agent'
  const visible = useMemo(() => {
    if (!q) return conversations
    return conversations.filter((conversation) => {
      const label =
        stripLegacySpacesConversationTitle(conversation.title) || 'Untitled conversation'
      const agentName = includeAgentInSearch
        ? getConversationAgentDisplay(conversation, agentByKey).name
        : ''
      return `${label} ${agentName}`.toLowerCase().includes(q)
    })
  }, [agentByKey, conversations, includeAgentInSearch, q])

  const groups = useMemo(() => {
    const agentNameByKey: Record<string, string> = {}
    if (agentByKey) {
      for (const [key, value] of Object.entries(agentByKey)) {
        agentNameByKey[key] = value.name
      }
    }
    const runtimePhaseById: Record<string, string | null | undefined> = {}
    if (conversationRuntimeById) {
      for (const [id, runtime] of Object.entries(conversationRuntimeById)) {
        runtimePhaseById[id] = runtime?.phase
      }
    }
    return groupConversationsForHistory(visible, {
      groupBy,
      agentNameByKey,
      campaignNameById,
      runtimePhaseById,
    })
  }, [agentByKey, campaignNameById, conversationRuntimeById, groupBy, visible])

  useEffect(() => {
    setSectionVisibleRows({})
    setSectionCollapsed({})
  }, [q, groupBy])

  const rowCapForSection = (section: string, total: number) => {
    if (groupBy === 'none') return total
    const cap = sectionVisibleRows[section] ?? INITIAL_SECTION_VISIBLE
    return Math.min(Math.max(cap, 0), total)
  }

  const toggleSectionCollapsed = (section: string) => {
    setSectionCollapsed((prevColl) => {
      const willExpand = prevColl[section] === true
      if (willExpand) {
        setSectionVisibleRows((prevRows) => {
          const next = { ...prevRows }
          delete next[section]
          return next
        })
      }
      return { ...prevColl, [section]: !prevColl[section] }
    })
  }

  const showMoreInSection = (section: string) => {
    setSectionVisibleRows((prev) => {
      const cur = prev[section] ?? INITIAL_SECTION_VISIBLE
      return { ...prev, [section]: cur + SECTION_VISIBLE_INCREMENT }
    })
  }

  const menuConversation = useMemo(
    () => conversations.find((c) => c.id === menuConversationId) ?? null,
    [conversations, menuConversationId],
  )

  const openMenuFor = (e: React.MouseEvent<HTMLButtonElement>, conversationId: string) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuAnchor({ top: rect.bottom + 4, left: rect.right - 224 })
    setMenuConversationId(conversationId)
  }

  const openMenuAtPointer = (e: React.MouseEvent<HTMLDivElement>, conversationId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuAnchor({ top: e.clientY, left: e.clientX })
    setMenuConversationId(conversationId)
  }

  const closeMenu = () => {
    setMenuConversationId(null)
    setMenuAnchor(null)
  }

  useEffect(() => {
    if (!collapsed) return
    setMenuConversationId(null)
    setMenuAnchor(null)
    setCompactSearchOpen(false)
  }, [collapsed])

  useEffect(() => {
    if (!openCompactSearch) return
    setCompactSearchOpen(true)
    onOpenCompactSearchConsumed?.()
  }, [openCompactSearch, onOpenCompactSearchConsumed])

  const startRename = (conversation: Conversation) => {
    setRenameId(conversation.id)
    setRenameDraft(stripLegacySpacesConversationTitle(conversation.title))
  }

  const submitRename = async () => {
    if (!renameId) return
    const trimmed = renameDraft.trim()
    const next = trimmed.length === 0 ? '' : trimmed.slice(0, 200)
    setRenameId(null)
    setRenameDraft('')
    await onRenameConversation(renameId, next)
  }

  const cancelRename = () => {
    setRenameId(null)
    setRenameDraft('')
  }

  const renderConversationRow = (conversation: Conversation, sectionId: string) => {
    const selected = conversation.id === selectedConversationId
    const pinned = Boolean(
      conversation.metadata &&
      typeof conversation.metadata === 'object' &&
      (conversation.metadata as { pinned?: unknown }).pinned === true,
    )
    const renaming = renameId === conversation.id
    const showSubtitle = sectionId === 'today' || sectionId === 'pinned' || groupBy === 'none'
    return (
      <SpaceConversationRow
        key={conversation.id}
        conversation={conversation}
        section={sectionId}
        selected={selected}
        pinned={pinned}
        renaming={renaming}
        renameDraft={renameDraft}
        showSubtitle={showSubtitle}
        runtimeState={conversationRuntimeById?.[conversation.id]}
        allAgentsMode={allAgentsMode}
        leadingIcon={leadingIcon}
        agentByKey={agentByKey}
        menuOpen={menuConversationId === conversation.id}
        renameInputRef={renameInputRef}
        onSelectConversation={onSelectConversation}
        onOpenMenu={openMenuFor}
        onOpenContextMenu={openMenuAtPointer}
        onRenameDraftChange={setRenameDraft}
        onSubmitRename={submitRename}
        onCancelRename={cancelRename}
        showUpdatedAt={showUpdatedAt}
        divided={dividedRows}
      />
    )
  }

  const expandedList = (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SpaceConversationsHeader
        query={query}
        onQueryChange={onQueryChange}
        onBack={onBack}
        onNewConversation={onNewConversation}
        hideBackButton={hideBackButton}
        hideHeaderBottomBorder={hideHeaderBottomBorder}
        compactHeader={compactHeader}
        compactSearchOpen={compactSearchOpen}
        onCompactSearchOpenChange={setCompactSearchOpen}
        onCollapsedChange={onCollapsedChange}
        showAllAgentsToggle={showAllAgentsToggle}
        allAgentsMode={allAgentsMode}
        onAllAgentsModeChange={onAllAgentsModeChange}
        hideNewButton={hideNewButton}
        newButtonBelowSearch={newButtonBelowSearch}
        hideSearch={hideSearch}
        searchSlot={searchSlot}
        headerStartSlot={headerStartSlot}
        headerEndSlot={headerEndSlot}
        headerFooterSlot={headerFooterSlot}
      />
      <div className="py-spacing-3 min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="body-4 text-muted-foreground p-spacing-4 text-center">
            Loading conversations...
          </div>
        ) : visible.length === 0 ? (
          <div className="p-spacing-4 text-center">
            <div className="gap-spacing-1 flex items-center justify-center">
              <MessageSquare className="text-muted-foreground icon-sm shrink-0" aria-hidden />
              <p className="body-4 whitespace-nowrap font-semibold">No conversations yet</p>
            </div>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              Start a chat and it will show up here.
            </p>
          </div>
        ) : (
          <SpaceConversationSections
            groups={groups}
            sectionCollapsed={sectionCollapsed}
            rowCapForSection={rowCapForSection}
            onToggleSectionCollapsed={toggleSectionCollapsed}
            onShowMoreInSection={showMoreInSection}
            renderConversationRow={renderConversationRow}
            dividedRows={dividedRows}
          />
        )}
      </div>

      <SpaceConversationActionsSurface
        menuConversation={menuConversationId !== null ? menuConversation : null}
        menuAnchor={menuAnchor}
        isOrgContext={isOrgContext}
        onClose={closeMenu}
        onCopyConversationLink={onCopyConversationLink}
        onCopyConversationId={onCopyConversationId}
        onOpenConversationInNewTab={onOpenConversationInNewTab}
        onShareConversation={onShareConversation}
        onRenameConversation={startRename}
        onTogglePinConversation={onTogglePinConversation}
        onToggleArchiveConversation={onToggleArchiveConversation}
        onMoveConversation={onMoveConversation}
        onDuplicateConversation={onDuplicateConversation}
        onDeleteConversation={onDeleteConversation}
      />
    </div>
  )

  if (!compactHeader || parentControlsCollapse) return expandedList

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{expandedList}</div>
}
