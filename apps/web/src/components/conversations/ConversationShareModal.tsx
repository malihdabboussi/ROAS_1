'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { stripLegacySpacesConversationTitle } from '@/lib/conversations/conversation-title'
import type {
  Conversation,
  ConversationShareLevel,
  ConversationShareRecord,
} from '@/lib/conversations/conversation.types'
import {
  deleteConversationShare,
  fetchConversationShares,
  upsertConversationShare,
} from '@/lib/conversations/conversations-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { ConversationShareInviteRow } from './ConversationShareInviteRow'
import { ConversationSharePeopleList } from './ConversationSharePeopleList'
import {
  CONVERSATION_SHARE_TOAST_ERRORS,
  CONVERSATION_SHARE_TOAST_SUCCESS,
  type ConversationShareRosterEntry,
} from './ConversationShareTypes'

export interface ConversationShareModalProps {
  activeOrgId: string | null
  open: boolean
  conversation: Conversation | null
  orgName: string
  roster: ConversationShareRosterEntry[]
  onClose: () => void
  onSharesChanged?: () => void
}

export function ConversationShareModal({
  activeOrgId,
  open,
  conversation,
  orgName,
  roster,
  onClose,
  onSharesChanged,
}: ConversationShareModalProps) {
  const [loading, setLoading] = useState(false)
  const [shares, setShares] = useState<ConversationShareRecord[]>([])
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteLevel, setInviteLevel] = useState<ConversationShareLevel>('view')
  const [sharingOpen, setSharingOpen] = useState(true)
  const [orgRowOpen, setOrgRowOpen] = useState(false)
  const [busyShareIds, setBusyShareIds] = useState<Record<string, boolean>>({})
  const inviteInputRef = useRef<HTMLInputElement>(null)

  const conversationId = conversation?.id ?? null
  const conversationName =
    stripLegacySpacesConversationTitle(conversation?.title) || 'Untitled conversation'

  const loadShares = useCallback(async () => {
    if (!open || !conversationId) return
    setLoading(true)
    try {
      const data = await fetchConversationShares(conversationId)
      setShares(data.shares)
    } catch (error) {
      toast.error(
        sanitizeUserError(
          error,
          CONVERSATION_SHARE_TOAST_ERRORS.LOAD_CONVERSATION_SHARES_FAILED.userMessage,
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [conversationId, open])

  useEffect(() => {
    void loadShares()
  }, [loadShares])

  const shareByUserId = useMemo(() => {
    const map = new Map<string, ConversationShareRecord>()
    for (const share of shares) {
      if (share.entity_type === 'user') map.set(share.entity_id, share)
    }
    return map
  }, [shares])

  const sharedOrgRow = useMemo(() => {
    if (!activeOrgId) return null
    return (
      shares.find((share) => share.entity_type === 'org' && share.entity_id === activeOrgId) ?? null
    )
  }, [activeOrgId, shares])

  const rosterByUserId = useMemo(() => {
    const map = new Map<string, ConversationShareRosterEntry>()
    for (const entry of roster) {
      if (entry.kind === 'human' && entry.user_id) map.set(entry.user_id, entry)
    }
    return map
  }, [roster])

  const inviteCandidates = useMemo(() => {
    const q = inviteQuery.trim().toLowerCase()
    if (!q) return []
    return roster
      .filter((entry) => entry.kind === 'human' && entry.user_id)
      .filter((entry) => {
        const name = entry.display_name.toLowerCase()
        const email = (entry.email ?? '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
      .slice(0, 5)
  }, [inviteQuery, roster])

  const resolveInviteTarget = useCallback((): ConversationShareRosterEntry | null => {
    const q = inviteQuery.trim().toLowerCase()
    if (!q) return null
    const humanRoster = roster.filter((entry) => entry.kind === 'human' && entry.user_id)
    const exactEmail = humanRoster.find((entry) => (entry.email ?? '').toLowerCase() === q)
    if (exactEmail) return exactEmail
    const exactName = humanRoster.find((entry) => entry.display_name.toLowerCase() === q)
    if (exactName) return exactName
    return inviteCandidates[0] ?? null
  }, [inviteCandidates, inviteQuery, roster])

  const upsertShare = useCallback(
    async (entityType: 'user' | 'org', entityId: string, level: ConversationShareLevel) => {
      if (!conversationId) return null
      const share = await upsertConversationShare(conversationId, {
        entity_type: entityType,
        entity_id: entityId,
        level,
      })
      setShares((prev) => {
        const exists = prev.some((row) => row.id === share.id)
        if (exists) return prev.map((row) => (row.id === share.id ? share : row))
        return [...prev, share]
      })
      onSharesChanged?.()
      return share
    },
    [conversationId, onSharesChanged],
  )

  const handleInvite = useCallback(async () => {
    const target = resolveInviteTarget()
    if (!target?.user_id) {
      toast.error(CONVERSATION_SHARE_TOAST_ERRORS.SELECT_MEMBER_REQUIRED.userMessage)
      return
    }
    const existing = shareByUserId.get(target.user_id)
    const shareId = existing?.id ?? `invite:${target.user_id}`
    setBusyShareIds((prev) => ({ ...prev, [shareId]: true }))
    try {
      await upsertShare('user', target.user_id, inviteLevel)
      setInviteQuery('')
      toast.success(CONVERSATION_SHARE_TOAST_SUCCESS.SHARE_UPDATED.userMessage)
    } catch (error) {
      toast.error(
        sanitizeUserError(error, CONVERSATION_SHARE_TOAST_ERRORS.INVITE_USER_FAILED.userMessage),
      )
    } finally {
      setBusyShareIds((prev) => ({ ...prev, [shareId]: false }))
    }
  }, [inviteLevel, resolveInviteTarget, shareByUserId, upsertShare])

  const handleLevelChange = useCallback(
    async (share: ConversationShareRecord, level: ConversationShareLevel) => {
      if (share.entity_type !== 'user' && share.entity_type !== 'org') return
      setBusyShareIds((prev) => ({ ...prev, [share.id]: true }))
      try {
        await upsertShare(share.entity_type, share.entity_id, level)
      } catch (error) {
        toast.error(
          sanitizeUserError(
            error,
            CONVERSATION_SHARE_TOAST_ERRORS.CHANGE_PERMISSION_FAILED.userMessage,
          ),
        )
      } finally {
        setBusyShareIds((prev) => ({ ...prev, [share.id]: false }))
      }
    },
    [upsertShare],
  )

  const handleToggleShare = useCallback(
    async (entry: ConversationShareRosterEntry, checked: boolean) => {
      if (!entry.user_id || !conversationId) return
      const existing = shareByUserId.get(entry.user_id)
      const key = existing?.id ?? `member:${entry.user_id}`
      setBusyShareIds((prev) => ({ ...prev, [key]: true }))
      try {
        if (checked) {
          await upsertShare('user', entry.user_id, inviteLevel)
        } else if (existing) {
          await deleteConversationShare(conversationId, existing.id)
          setShares((prev) => prev.filter((row) => row.id !== existing.id))
          onSharesChanged?.()
        }
      } catch (error) {
        toast.error(
          sanitizeUserError(
            error,
            CONVERSATION_SHARE_TOAST_ERRORS.UPDATE_CONVERSATION_SHARE_FAILED.userMessage,
          ),
        )
      } finally {
        setBusyShareIds((prev) => ({ ...prev, [key]: false }))
      }
    },
    [conversationId, inviteLevel, onSharesChanged, shareByUserId, upsertShare],
  )

  const handleToggleOrgShare = useCallback(async () => {
    if (!conversationId || !activeOrgId) return
    const key = sharedOrgRow?.id ?? `org:${activeOrgId}`
    setBusyShareIds((prev) => ({ ...prev, [key]: true }))
    try {
      if (sharedOrgRow) {
        await deleteConversationShare(conversationId, sharedOrgRow.id)
        setShares((prev) => prev.filter((row) => row.id !== sharedOrgRow.id))
        onSharesChanged?.()
      } else {
        await upsertShare('org', activeOrgId, inviteLevel)
      }
    } catch (error) {
      toast.error(
        sanitizeUserError(
          error,
          CONVERSATION_SHARE_TOAST_ERRORS.UPDATE_ORG_SHARE_FAILED.userMessage,
        ),
      )
    } finally {
      setBusyShareIds((prev) => ({ ...prev, [key]: false }))
    }
  }, [activeOrgId, conversationId, inviteLevel, onSharesChanged, sharedOrgRow, upsertShare])

  const handleRemoveShare = useCallback(
    async (share: ConversationShareRecord) => {
      if (!conversationId) return
      await deleteConversationShare(conversationId, share.id)
      setShares((prev) => prev.filter((row) => row.id !== share.id))
      onSharesChanged?.()
    },
    [conversationId, onSharesChanged],
  )

  const rosterHumanUserIds = useMemo(() => {
    const ids = new Set<string>()
    for (const entry of roster) {
      if (entry.kind === 'human' && entry.user_id) ids.add(entry.user_id)
    }
    return ids
  }, [roster])

  const sharedUsersNotInRoster = useMemo(
    () =>
      shares.filter(
        (share) => share.entity_type === 'user' && !rosterHumanUserIds.has(share.entity_id),
      ),
    [rosterHumanUserIds, shares],
  )

  if (!conversation) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-content surface-card wizard-container-border rounded-spacing-4 fixed left-1/2 top-1/2 flex w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden shadow-2xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inviteInputRef.current?.focus()
          }}
        >
          <div className="px-spacing-6 pt-spacing-6 pb-spacing-4">
            <div className="flex items-center justify-between">
              <DialogPrimitive.Title className="title-h6 text-foreground font-semibold uppercase tracking-wide">
                Share conversation
              </DialogPrimitive.Title>
              <Tooltip label="Close" side="top" delayMs={200}>
                <DialogPrimitive.Close
                  type="button"
                  className="btn-icon-bare shrink-0"
                  aria-label="Close share conversation"
                >
                  <X className="icon-sm" />
                </DialogPrimitive.Close>
              </Tooltip>
            </div>
            <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
              <span className="text-foreground font-medium">{conversationName}</span>
            </DialogPrimitive.Description>
          </div>

          <ConversationShareInviteRow
            inviteCandidates={inviteCandidates}
            inviteInputRef={inviteInputRef}
            inviteLevel={inviteLevel}
            inviteQuery={inviteQuery}
            onInvite={() => void handleInvite()}
            onInviteLevelChange={setInviteLevel}
            onInviteQueryChange={setInviteQuery}
          />

          <ConversationSharePeopleList
            activeOrgId={activeOrgId}
            busyShareIds={busyShareIds}
            inviteLevel={inviteLevel}
            loading={loading}
            orgName={orgName}
            orgRowOpen={orgRowOpen}
            roster={roster}
            rosterByUserId={rosterByUserId}
            shareByUserId={shareByUserId}
            sharedOrgRow={sharedOrgRow}
            sharedUsersNotInRoster={sharedUsersNotInRoster}
            sharingOpen={sharingOpen}
            onLevelChange={(share, level) => void handleLevelChange(share, level)}
            onOrgRowOpenChange={setOrgRowOpen}
            onRemoveShare={(share) => void handleRemoveShare(share)}
            onSharingOpenChange={setSharingOpen}
            onToggleOrgShare={() => void handleToggleOrgShare()}
            onToggleShare={(entry, checked) => void handleToggleShare(entry, checked)}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
