'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MessageSquare } from 'lucide-react'
import {
  getConversationAgentDisplay,
  groupConversationsBySection,
  isConversationPinned,
  stripLegacySpacesConversationTitle,
  type Conversation,
  type ConversationAgentDisplay,
  type ConversationSection,
} from '@/lib/conversations'
import { SpaceConversationActionsSurface } from './SpaceConversationActionsSurface'
import { SpaceConversationsHeader } from './SpaceConversationsHeader'
import {
  SpaceConversationRow,
  type ConversationRowRuntimeState,
} from './SpaceConversationRows'
import { SpaceConversationSections } from './SpaceConversationSections'

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
  agentByKey?: Record<string, ConversationAgentDisplay>
  hideNewButton?: boolean
  /** When true, omit the inline list search (caller owns search UI). */
  hideSearch?: boolean
  /** Parent-owned search control shown after agent/filter when `hideSearch` is true. */
  searchSlot?: ReactNode
  headerEndSlot?: ReactNode
}

const INITIAL_SECTION_VISIBLE = 6
const SECTION_VISIBLE_INCREMENT = 6
const SUBTITLE_SECTIONS: ReadonlySet<ConversationSection> = new Set(['pinned', 'today'])

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
  agentByKey,
  hideNewButton,
  hideSearch,
  searchSlot,
  headerEndSlot,
}: SpaceConversationsListProps) {
  const [menuConversationId, setMenuConversationId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [compactSearchOpen, setCompactSearchOpen] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [sectionCollapsed, setSectionCollapsed] = useState<
    Partial<Record<ConversationSection, boolean>>
  >({})
  const [sectionVisibleRows, setSectionVisibleRows] = useState<
    Partial<Record<ConversationSection, number>>
  >({})

  useEffect(() => {
    if (renameId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renameId])

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!q) return conversations
    return conversations.filter((conversation) => {
      const label =
        stripLegacySpacesConversationTitle(conversation.title) || 'Untitled conversation'
      const agentName = allAgentsMode
        ? getConversationAgentDisplay(conversation, agentByKey).name
        : ''
      return `${label} ${agentName}`.toLowerCase().includes(q)
    })
  }, [agentByKey, allAgentsMode, conversations, q])

  const grouped = useMemo(() => groupConversationsBySection(visible), [visible])

  useEffect(() => {
    setSectionVisibleRows({})
    setSectionCollapsed({})
  }, [q])

  const rowCapForSection = (section: ConversationSection, total: number) => {
    const cap = sectionVisibleRows[section] ?? INITIAL_SECTION_VISIBLE
    return Math.min(Math.max(cap, 0), total)
  }

  const toggleSectionCollapsed = (section: ConversationSection) => {
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

  const showMoreInSection = (section: ConversationSection) => {
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

  const renderConversationRow = (conversation: Conversation, section: ConversationSection) => {
    const selected = conversation.id === selectedConversationId
    const pinned = isConversationPinned(conversation)
    const renaming = renameId === conversation.id
    const showSubtitle = SUBTITLE_SECTIONS.has(section)
    return (
      <SpaceConversationRow
        key={conversation.id}
        conversation={conversation}
        section={section}
        selected={selected}
        pinned={pinned}
        renaming={renaming}
        renameDraft={renameDraft}
        showSubtitle={showSubtitle}
        runtimeState={conversationRuntimeById?.[conversation.id]}
        allAgentsMode={allAgentsMode}
        agentByKey={agentByKey}
        menuOpen={menuConversationId === conversation.id}
        renameInputRef={renameInputRef}
        onSelectConversation={onSelectConversation}
        onOpenMenu={openMenuFor}
        onOpenContextMenu={openMenuAtPointer}
        onRenameDraftChange={setRenameDraft}
        onSubmitRename={submitRename}
        onCancelRename={cancelRename}
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
        hideSearch={hideSearch}
        searchSlot={searchSlot}
        headerEndSlot={headerEndSlot}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-spacing-2">
        {loading ? (
          <div className="body-4 text-muted-foreground p-spacing-4 text-center">
            Loading conversations...
          </div>
        ) : visible.length === 0 ? (
          <div className="p-spacing-6 text-center">
            <MessageSquare className="text-muted-foreground mx-auto icon-lg" />
            <p className="body-3 mt-spacing-2 font-semibold">No conversations yet</p>
            <p className="body-4 text-muted-foreground mt-spacing-1">
              Start a chat and it will show up here.
            </p>
          </div>
        ) : (
          <SpaceConversationSections
            grouped={grouped}
            sectionCollapsed={sectionCollapsed}
            rowCapForSection={rowCapForSection}
            onToggleSectionCollapsed={toggleSectionCollapsed}
            onShowMoreInSection={showMoreInSection}
            renderConversationRow={renderConversationRow}
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
