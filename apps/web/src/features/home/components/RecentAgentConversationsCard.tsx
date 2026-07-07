'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { ConversationActionsMenu, ConversationShareModal } from '@/components/conversations'
import {
  HomeFeedScopeHoverReveal,
  HomeFeedScopePicker,
  usePersistedHomeFeedScope,
} from '@/features/home/components/HomeFeedScopePicker'
import { RecentAgentConversationsRows } from '@/features/home/components/RecentAgentConversationsRows'
import { useHomeCustomizeEditing } from '@/features/home/context/home-customize-context'
import { backendOptionsForHomeFeed } from '@/features/home/types/home-feed-scope'
import { orgService, type TeamRosterEntry } from '@/features/org/services/org.service'
import { useOrgStore } from '@/features/org/store/use-org-store'
import {
  conversationHref,
  hasConversationLevel,
  INITIAL_RECENT_CONVERSATION_ROWS,
  isArchivedConversation,
  isPinnedConversation,
  LOAD_MORE_RECENT_CONVERSATION_ROWS,
  readSoftHiddenIds,
  writeSoftHiddenIds,
} from '@/features/home/lib/recent-agent-conversations'
import {
  assignConversationCampaign,
  deleteConversation,
  duplicateConversation,
  fetchConversations,
  renameConversation,
  setConversationArchived,
  setConversationPinned,
} from '@/lib/conversations/conversations-api'
import { stripLegacySpacesConversationTitle } from '@/lib/conversations/conversation-title'
import type { Conversation } from '@/lib/conversations/conversation.types'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { HOME_TOAST_ERRORS, HOME_TOAST_SUCCESS } from '../config/home-toast-errors.config'

export function RecentAgentConversationsCard() {
  const router = useRouter()
  const customizeEditing = useHomeCustomizeEditing()
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const conversationShareOrgName = useOrgStore(
    (s) => s.getActiveOrg()?.organizations.name ?? 'Workspace',
  )
  const isOrgContext = activeOrgId !== null
  const { scope, updateScope } = usePersistedHomeFeedScope('conversations')

  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [agentAvatarByKey, setAgentAvatarByKey] = useState<Map<string, string | null>>(new Map())
  const [agentDisplayNameByKey, setAgentDisplayNameByKey] = useState<Map<string, string>>(new Map())
  const [softHiddenIds, setSoftHiddenIds] = useState<Set<string>>(() => readSoftHiddenIds())
  const [visibleCount, setVisibleCount] = useState(INITIAL_RECENT_CONVERSATION_ROWS)

  const [menuConversationId, setMenuConversationId] = useState<string | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [shareConversation, setShareConversation] = useState<Conversation | null>(null)
  const [rosterHumans, setRosterHumans] = useState<TeamRosterEntry[]>([])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const feedOrgId = scope.feedScope === 'org' ? (scope.orgId ?? undefined) : undefined
      const list = await fetchConversations(
        scope.campaignId,
        null,
        null,
        {
          feedScope: scope.feedScope,
          feedOrgId,
        },
        backendOptionsForHomeFeed(scope.feedScope, scope.orgId),
      )
      setConversations(list.filter((c) => c.status === 'active'))
    } finally {
      setLoading(false)
    }
  }, [scope.feedScope, scope.orgId, scope.campaignId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    setVisibleCount(INITIAL_RECENT_CONVERSATION_ROWS)
  }, [conversations])

  useEffect(() => {
    let cancelled = false
    orgService
      .listRoster({ kind: 'agent' })
      .then((rows) => {
        if (cancelled) return
        const avatars = new Map<string, string | null>()
        const names = new Map<string, string>()
        for (const row of rows) {
          if (row.kind === 'agent' && row.agent_key) {
            avatars.set(row.agent_key, row.avatar_url ?? null)
            names.set(row.agent_key, (row.display_name ?? '').trim() || row.agent_key)
          }
        }
        setAgentAvatarByKey(avatars)
        setAgentDisplayNameByKey(names)
      })
      .catch(() => {
        if (!cancelled) {
          setAgentAvatarByKey(new Map())
          setAgentDisplayNameByKey(new Map())
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isOrgContext) {
      setRosterHumans([])
      return
    }
    let cancelled = false
    orgService
      .listRoster({ kind: 'human' })
      .then((rows) => {
        if (!cancelled) setRosterHumans(rows)
      })
      .catch(() => {
        if (!cancelled) setRosterHumans([])
      })
    return () => {
      cancelled = true
    }
  }, [isOrgContext])

  const sortedActive = useMemo(() => {
    const active = conversations.filter((c) => c.status === 'active')
    active.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return active
  }, [conversations])

  const nonHiddenActive = useMemo(
    () => sortedActive.filter((c) => !softHiddenIds.has(c.id)),
    [sortedActive, softHiddenIds],
  )

  const visibleRows = useMemo(
    () => nonHiddenActive.slice(0, visibleCount),
    [nonHiddenActive, visibleCount],
  )

  const setSoftHidden = useCallback((id: string, hidden: boolean) => {
    setSoftHiddenIds((prev) => {
      const next = new Set(prev)
      if (hidden) next.add(id)
      else next.delete(id)
      writeSoftHiddenIds(next)
      return next
    })
  }, [])

  const clearSoftHidden = useCallback(() => {
    setSoftHiddenIds(() => {
      writeSoftHiddenIds(new Set())
      return new Set()
    })
  }, [])

  const openMenuFor = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, conversationId: string) => {
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      setMenuAnchor({ top: rect.bottom + 4, left: rect.right - 224 })
      setMenuConversationId(conversationId)
    },
    [],
  )

  const closeMenu = useCallback(() => {
    setMenuConversationId(null)
    setMenuAnchor(null)
  }, [])

  const menuConversation = useMemo(
    () => conversations.find((c) => c.id === menuConversationId) ?? null,
    [conversations, menuConversationId],
  )

  const handleRenameFromMenu = useCallback(() => {
    if (!menuConversation) return
    const current = stripLegacySpacesConversationTitle(menuConversation.title)
    const draft = window.prompt('Conversation title', current)
    if (draft === null) return
    const trimmed = draft.trim().slice(0, 200)
    void renameConversation(menuConversation.id, trimmed).then(() => {
      setConversations((prev) =>
        prev.map((c) => (c.id === menuConversation.id ? { ...c, title: trimmed } : c)),
      )
      closeMenu()
    })
  }, [closeMenu, menuConversation])

  const handleTogglePin = useCallback(() => {
    if (!menuConversation) return
    const pinned = !isPinnedConversation(menuConversation)
    void setConversationPinned(menuConversation.id, pinned).then((updated) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, metadata: updated.metadata } : c)),
      )
      closeMenu()
    })
  }, [closeMenu, menuConversation])

  const handleToggleArchive = useCallback(() => {
    if (!menuConversation) return
    const archived = !isArchivedConversation(menuConversation)
    void setConversationArchived(menuConversation.id, archived).then(() => {
      void reload()
      closeMenu()
    })
  }, [closeMenu, menuConversation, reload])

  const handleMoveTo = useCallback(
    (campaignId: string | null) => {
      if (!menuConversation) return
      void assignConversationCampaign(menuConversation.id, campaignId).then((updated) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, campaign_id: updated.campaign_id } : c)),
        )
        closeMenu()
      })
    },
    [closeMenu, menuConversation],
  )

  const handleDuplicateInPlace = useCallback(() => {
    if (!menuConversation) return
    void duplicateConversation(menuConversation.id)
      .then((created) => {
        setConversations((prev) => [created, ...prev.filter((c) => c.id !== created.id)])
        closeMenu()
      })
      .catch(() => {
        toast.error(HOME_TOAST_ERRORS.DUPLICATE_CONVERSATION_FAILED.userMessage)
      })
  }, [closeMenu, menuConversation])

  const handleDuplicateToCampaign = useCallback(
    (campaignId: string | null) => {
      if (!menuConversation) return
      void duplicateConversation(menuConversation.id, { campaignId })
        .then((created) => {
          setConversations((prev) => [created, ...prev.filter((c) => c.id !== created.id)])
          closeMenu()
        })
        .catch(() => {
          toast.error(HOME_TOAST_ERRORS.DUPLICATE_CONVERSATION_FAILED.userMessage)
        })
    },
    [closeMenu, menuConversation],
  )

  const handleDelete = useCallback(() => {
    if (!menuConversation) return
    void deleteConversation(menuConversation.id).then(() => {
      setConversations((prev) => prev.filter((c) => c.id !== menuConversation.id))
      closeMenu()
    })
  }, [closeMenu, menuConversation])

  const handleCopyLink = useCallback(() => {
    if (!menuConversation || typeof window === 'undefined') return
    const url = `${window.location.origin}${conversationHref(menuConversation)}`
    void navigator.clipboard.writeText(url)
    toast.success(HOME_TOAST_SUCCESS.LINK_COPIED.userMessage)
    closeMenu()
  }, [closeMenu, menuConversation])

  const openConversation = useCallback(
    (c: Conversation) => {
      router.push(conversationHref(c))
    },
    [router],
  )

  const openConversationNewTab = useCallback((c: Conversation) => {
    if (typeof window === 'undefined') return
    openInNewTab(conversationHref(c))
  }, [])

  const handleSeeMore = useCallback(() => {
    setVisibleCount((n) => n + LOAD_MORE_RECENT_CONVERSATION_ROWS)
  }, [])

  const softHiddenCount = softHiddenIds.size

  return (
    <div className="group/home-feed-head section-card card-elevated flex h-[420px] min-w-0 flex-col overflow-hidden">
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <MessageSquare className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="body-2 text-foreground font-medium">Recent conversations</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <HomeFeedScopeHoverReveal>
            <HomeFeedScopePicker variant="conversations" scope={scope} onChange={updateScope} />
          </HomeFeedScopeHoverReveal>
          {softHiddenCount > 0 && !customizeEditing ? (
            <button
              type="button"
              onClick={clearSoftHidden}
              className="body-3 text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Clear hidden ({softHiddenCount})
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <RecentAgentConversationsRows
          loading={loading}
          sortedActiveCount={sortedActive.length}
          nonHiddenActiveCount={nonHiddenActive.length}
          visibleRows={visibleRows}
          visibleCount={visibleCount}
          customizeEditing={customizeEditing}
          agentAvatarByKey={agentAvatarByKey}
          agentDisplayNameByKey={agentDisplayNameByKey}
          onOpenConversation={openConversation}
          onOpenConversationNewTab={openConversationNewTab}
          onOpenMenu={openMenuFor}
          onSetSoftHidden={setSoftHidden}
          onSeeMore={handleSeeMore}
        />
      </div>

      <ConversationActionsMenu
        open={menuConversationId !== null && menuConversation !== null}
        anchor={menuAnchor}
        isPinned={menuConversation ? isPinnedConversation(menuConversation) : false}
        isArchived={menuConversation ? isArchivedConversation(menuConversation) : false}
        currentCampaignId={menuConversation?.campaign_id ?? null}
        showCopyLink={isOrgContext}
        showShare={isOrgContext}
        canEdit={hasConversationLevel(menuConversation, 'edit')}
        canAdmin={hasConversationLevel(menuConversation, 'admin')}
        onClose={closeMenu}
        onCopyLink={handleCopyLink}
        onShare={() => menuConversation && setShareConversation(menuConversation)}
        onRename={handleRenameFromMenu}
        onTogglePin={handleTogglePin}
        onMoveTo={handleMoveTo}
        onDuplicate={handleDuplicateInPlace}
        onDuplicateTo={handleDuplicateToCampaign}
        onToggleArchive={handleToggleArchive}
        onDelete={handleDelete}
      />

      {isOrgContext ? (
        <ConversationShareModal
          activeOrgId={activeOrgId}
          open={shareConversation !== null}
          conversation={shareConversation}
          orgName={conversationShareOrgName}
          roster={rosterHumans}
          onClose={() => setShareConversation(null)}
          onSharesChanged={() => void reload()}
        />
      ) : null}
    </div>
  )
}
