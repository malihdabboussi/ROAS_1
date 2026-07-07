'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, LayoutGrid, Link2, X } from 'lucide-react'
import { toast } from 'sonner'
import Switch from '@/components/ui/forms/switch'
import { Tooltip } from '@/components/ui/tooltip'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { SettingsDropdown } from '@/features/studio/components/preview/SettingsDropdown'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { SPACES_SHARE_TOAST_ERRORS } from '../config/spaces-toast-errors.config'
import {
  deleteSpaceItemShare,
  deleteSpaceShare,
  disableSpaceItemShareLink,
  enableSpaceItemShareLink,
  fetchSpaceItemShares,
  fetchSpaceShares,
  makeSpacePrivate,
  makeSpaceTeam,
  upsertSpaceItemShare,
  upsertSpaceShare,
  type SpaceItemShareRecord,
  type SpaceShareLevel,
  type SpaceShareRecord,
} from '../services/spaces.service'
import type { Space, SpaceItem } from '../types'
import { RosterMemberAvatar } from './cells/AssigneeCell'

const PERMISSION_OPTIONS: ReadonlyArray<{ value: SpaceShareLevel; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'edit', label: 'Edit' },
  { value: 'view', label: 'View only' },
]

const PERMISSION_DROPDOWN_OPTIONS = PERMISSION_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}))

interface ShareModalProps {
  open: boolean
  onClose: () => void
  entityType: 'item' | 'space'
  spaceId: string
  entityId: string
  entityName: string
  docMode?: boolean
  item?: SpaceItem | null
  spaceVisibility?: Space['visibility']
  spaceShareLinkEnabled?: boolean
  spaceShareToken?: string | null
  roster?: TeamRosterEntry[]
  onItemPatch?: (patch: Partial<SpaceItem>) => Promise<void> | void
  onSpacePatch?: (patch: Partial<Space>) => Promise<void> | void
  /** Space-only: switch UI between view-scoped public link (?v=) vs whole space */
  dualSpaceShareNavigator?: boolean
  dualNavigatorInitialScope?: 'view' | 'space'
  activeViewId?: string | null
  activeViewName?: string | null
  canManageSharing?: boolean
}

export function ShareModal({
  open,
  onClose,
  entityType,
  spaceId,
  entityId,
  entityName,
  docMode = false,
  item,
  spaceVisibility = 'private',
  roster = [],
  onItemPatch,
  onSpacePatch,
  dualSpaceShareNavigator = false,
  dualNavigatorInitialScope = 'view',
  activeViewId = null,
  activeViewName = null,
  canManageSharing = true,
}: ShareModalProps) {
  const { activeOrgId, getActiveOrg } = useOrgStore()
  type ShareRecord = Pick<
    SpaceItemShareRecord,
    'id' | 'entity_type' | 'entity_id' | 'level' | 'invited_email' | 'invite_token'
  > &
    Partial<
      Pick<
        SpaceShareRecord,
        'space_id' | 'org_id' | 'created_at' | 'created_by' | 'allowed_view_ids'
      >
    >

  const [loading, setLoading] = useState(false)
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteLevel, setInviteLevel] = useState<SpaceShareLevel>('view')
  const [sharingOpen, setSharingOpen] = useState(true)
  const [orgRowOpen, setOrgRowOpen] = useState(false)
  const [busyShareIds, setBusyShareIds] = useState<Record<string, boolean>>({})
  const [itemPrivate, setItemPrivate] = useState<boolean>(item?.is_private ?? false)
  const [spacePrivate, setSpacePrivate] = useState<boolean>(spaceVisibility === 'private')
  const [shareLinkEnabled, setShareLinkEnabled] = useState<boolean>(
    item?.share_link_enabled ?? false,
  )
  const [shareToken, setShareToken] = useState<string | null>(item?.share_token ?? null)
  const [shareLinkBusy, setShareLinkBusy] = useState(false)
  const inviteInputRef = useRef<HTMLInputElement>(null)
  const [dualScope, setDualScope] = useState<'view' | 'space'>('view')
  const [restrictToCurrentView, setRestrictToCurrentView] = useState(true)

  const orgName = getActiveOrg()?.organizations.name ?? 'Workspace'
  const showWorkspacePeopleSharing = Boolean(activeOrgId)
  const dualNavigatorActive = Boolean(dualSpaceShareNavigator && entityType === 'space')

  useEffect(() => {
    if (!open || !showWorkspacePeopleSharing) return
    setTimeout(() => inviteInputRef.current?.focus(), 100)
  }, [open, showWorkspacePeopleSharing])

  useEffect(() => {
    if (entityType === 'item') {
      setItemPrivate(item?.is_private ?? false)
      setShareLinkEnabled(item?.share_link_enabled ?? false)
      setShareToken(item?.share_token ?? null)
      return
    }
  }, [entityType, item])

  useEffect(() => {
    setSpacePrivate(spaceVisibility === 'private')
  }, [spaceVisibility])

  useEffect(() => {
    if (!open || !dualSpaceShareNavigator || entityType !== 'space') return
    setDualScope(dualNavigatorInitialScope ?? 'view')
  }, [open, dualSpaceShareNavigator, entityType, dualNavigatorInitialScope])

  const loadShares = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const data =
        entityType === 'item'
          ? await fetchSpaceItemShares(spaceId, entityId)
          : await fetchSpaceShares(spaceId)
      setShares(data.shares)
    } catch (error) {
      toast.error(
        sanitizeUserError(error, SPACES_SHARE_TOAST_ERRORS.LOAD_SHARES_FAILED.userMessage),
      )
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, open, spaceId])

  useEffect(() => {
    if (!open) return
    void loadShares()
  }, [open, loadShares])

  const shareByUserId = useMemo(() => {
    const map = new Map<string, ShareRecord>()
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
    const map = new Map<string, TeamRosterEntry>()
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

  const resolveInviteTarget = useCallback((): TeamRosterEntry | null => {
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
    async (entityTypeValue: 'user' | 'org', entityIdValue: string, level: SpaceShareLevel) => {
      const share =
        entityType === 'item'
          ? await upsertSpaceItemShare(spaceId, entityId, {
              entity_type: entityTypeValue,
              entity_id: entityIdValue,
              level,
            })
          : await upsertSpaceShare(spaceId, {
              entity_type: entityTypeValue,
              entity_id: entityIdValue,
              level,
              allowed_view_ids:
                dualNavigatorActive && restrictToCurrentView && activeViewId
                  ? [activeViewId]
                  : null,
            })
      setShares((prev) => {
        const exists = prev.some((row) => row.id === share.id)
        if (exists) return prev.map((row) => (row.id === share.id ? share : row))
        return [...prev, share]
      })
      return share
    },
    [activeViewId, dualNavigatorActive, entityId, entityType, restrictToCurrentView, spaceId],
  )

  const handleInvite = useCallback(async () => {
    if (!canManageSharing) return
    const target = resolveInviteTarget()
    if (target?.user_id) {
      const existing = shareByUserId.get(target.user_id)
      const shareId = existing?.id ?? `invite:${target.user_id}`
      setBusyShareIds((prev) => ({ ...prev, [shareId]: true }))
      try {
        await upsertShare('user', target.user_id, inviteLevel)
        setInviteQuery('')
        toast.success('Share updated')
      } catch (error) {
        toast.error(sanitizeUserError(error, SPACES_SHARE_TOAST_ERRORS.INVITE_FAILED.userMessage))
      } finally {
        setBusyShareIds((prev) => ({ ...prev, [shareId]: false }))
      }
      return
    }

    // External email invites are paused while sharing is being re-scoped to
    // internal team/workspace access only. See `.documentation/sharing/external-sharing-paused.md`.
    // if (entityType === 'item') {
    //   if (!EMAIL_REGEX.test(normalizedInvite)) {
    //     toast.error('Enter a valid email')
    //     return
    //   }
    //   const busyKey = `invite-email:${normalizedInvite}`
    //   setBusyShareIds((prev) => ({ ...prev, [busyKey]: true }))
    //   try {
    //     const share = await inviteSpaceItemByEmail(spaceId, entityId, {
    //       email: normalizedInvite,
    //       level: inviteLevel,
    //     })
    //     setShares((prev) => {
    //       const filtered = prev.filter(
    //         (row) => !(row.entity_type === 'email' && row.invited_email === normalizedInvite),
    //       )
    //       return [...filtered, share]
    //     })
    //     setInviteQuery('')
    //     toast.success('Invite sent')
    //   } catch (error) {
    //     toast.error(sanitizeUserError(error, 'Failed to send invite'))
    //   } finally {
    //     setBusyShareIds((prev) => ({ ...prev, [busyKey]: false }))
    //   }
    //   return
    // }

    toast.error('Select a workspace member by name or email')
  }, [canManageSharing, inviteLevel, resolveInviteTarget, shareByUserId, upsertShare])

  const handleLevelChange = useCallback(
    async (share: ShareRecord, level: SpaceShareLevel) => {
      if (share.entity_type !== 'user' && share.entity_type !== 'org') return
      setBusyShareIds((prev) => ({ ...prev, [share.id]: true }))
      try {
        await upsertShare(share.entity_type, share.entity_id, level)
      } catch (error) {
        toast.error(
          sanitizeUserError(error, SPACES_SHARE_TOAST_ERRORS.CHANGE_PERMISSION_FAILED.userMessage),
        )
      } finally {
        setBusyShareIds((prev) => ({ ...prev, [share.id]: false }))
      }
    },
    [upsertShare],
  )

  const handleToggleShare = useCallback(
    async (entry: TeamRosterEntry, checked: boolean) => {
      if (!entry.user_id) return
      const existing = shareByUserId.get(entry.user_id)
      const key = existing?.id ?? `toggle:${entry.user_id}`
      setBusyShareIds((prev) => ({ ...prev, [key]: true }))
      try {
        if (checked) {
          await upsertShare('user', entry.user_id, inviteLevel)
        } else if (existing) {
          if (entityType === 'item') {
            await deleteSpaceItemShare(spaceId, entityId, existing.id)
          } else {
            await deleteSpaceShare(spaceId, existing.id)
          }
          setShares((prev) => prev.filter((row) => row.id !== existing.id))
        }
      } catch (error) {
        toast.error(
          sanitizeUserError(error, SPACES_SHARE_TOAST_ERRORS.UPDATE_SHARE_FAILED.userMessage),
        )
      } finally {
        setBusyShareIds((prev) => ({ ...prev, [key]: false }))
      }
    },
    [entityId, entityType, inviteLevel, shareByUserId, spaceId, upsertShare],
  )

  const handleTogglePrivate = useCallback(
    async (nextPrivate: boolean) => {
      try {
        await onItemPatch?.({ is_private: nextPrivate })
        setItemPrivate(nextPrivate)
      } catch (error) {
        toast.error(
          sanitizeUserError(error, SPACES_SHARE_TOAST_ERRORS.UPDATE_VISIBILITY_FAILED.userMessage),
        )
      }
    },
    [onItemPatch],
  )

  const handleToggleShareLink = useCallback(
    async (checked: boolean) => {
      setShareLinkBusy(true)
      try {
        const result = checked
          ? await enableSpaceItemShareLink(spaceId, entityId)
          : await disableSpaceItemShareLink(spaceId, entityId)
        setShareLinkEnabled(result.share_link_enabled)
        setShareToken(result.share_token)
      } catch (error) {
        toast.error(
          sanitizeUserError(error, SPACES_SHARE_TOAST_ERRORS.UPDATE_SHARE_FAILED.userMessage),
        )
      } finally {
        setShareLinkBusy(false)
      }
    },
    [entityId, spaceId],
  )

  const shareLinkUrl =
    shareLinkEnabled && shareToken && typeof window !== 'undefined'
      ? `${window.location.origin}/shared/item/${shareToken}`
      : null

  const handleCopyShareLink = useCallback(async () => {
    if (!shareLinkUrl) return
    try {
      await navigator.clipboard.writeText(shareLinkUrl)
      toast.success('Link copied')
    } catch {
      toast.error('Failed to copy — try again.')
    }
  }, [shareLinkUrl])

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
  const sharedEmailInvites = useMemo(
    () => shares.filter((share) => share.entity_type === 'email'),
    [shares],
  )

  const handleToggleSpaceVisibility = useCallback(
    async (nextPrivate: boolean) => {
      try {
        const updated = nextPrivate ? await makeSpacePrivate(spaceId) : await makeSpaceTeam(spaceId)
        setSpacePrivate(updated.visibility === 'private')
        await onSpacePatch?.({ visibility: updated.visibility })
      } catch (error) {
        toast.error(
          sanitizeUserError(error, SPACES_SHARE_TOAST_ERRORS.UPDATE_VISIBILITY_FAILED.userMessage),
        )
      }
    },
    [onSpacePatch, spaceId],
  )

  const headerTitle = dualNavigatorActive
    ? dualScope === 'view'
      ? 'Share this view'
      : 'Share this Space'
    : entityType === 'space'
      ? 'Share this space'
      : docMode
        ? 'Share this Doc'
        : 'Share this task'
  const showInviteComposer = showWorkspacePeopleSharing

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="z-modal-backdrop fixed inset-0 flex items-center justify-center bg-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="z-modal-content surface-card wizard-container-border rounded-spacing-4 flex w-full max-w-[520px] flex-col overflow-hidden shadow-2xl">
        <div className="px-spacing-6 pt-spacing-6 pb-spacing-4">
          {dualNavigatorActive && dualScope === 'space' && activeViewId ? (
            <button
              type="button"
              onClick={() => setDualScope('view')}
              className="mb-spacing-4 px-spacing-4 py-spacing-2 body-3 flex w-full items-center justify-between rounded-full border border-[var(--color-border)] text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
            >
              <span className="text-foreground min-w-0 truncate">
                Share this view · <span className="text-muted-foreground">single view</span>
              </span>
              <ChevronRight className="icon-sm text-muted-foreground shrink-0" />
            </button>
          ) : null}
          <div className="flex items-center justify-between">
            <h2 className="title-h6 text-foreground font-semibold uppercase tracking-wide">
              {headerTitle}
            </h2>
            <Tooltip label="Close" side="top" delayMs={200}>
              <button type="button" onClick={onClose} className="btn-icon-bare shrink-0">
                <X className="icon-sm" />
              </button>
            </Tooltip>
          </div>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            {dualNavigatorActive ? (
              dualScope === 'view' ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span>Sharing as a single view</span>
                  <LayoutGrid className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  <span className="text-foreground font-medium">{activeViewName ?? 'View'}</span>
                </span>
              ) : (
                <>
                  Sharing space with all views ·{' '}
                  <span className="text-foreground font-medium">{entityName}</span>
                </>
              )
            ) : (
              <span className="text-foreground font-medium">{entityName}</span>
            )}
          </p>
        </div>

        {showInviteComposer ? (
          <div className="px-spacing-6 pt-spacing-3">
            <div className="gap-spacing-2 flex items-center">
              <input
                ref={inviteInputRef}
                type="text"
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleInvite()
                }}
                disabled={!canManageSharing}
                placeholder={
                  showWorkspacePeopleSharing ? 'Invite by name or email' : 'Invite by email'
                }
                className="input-glass body-3 text-foreground h-spacing-8 rounded-spacing-2 px-spacing-3 py-spacing-1 min-w-0 flex-1"
              />
              <div className="w-[9.5rem] shrink-0">
                <SettingsDropdown
                  value={inviteLevel}
                  options={PERMISSION_DROPDOWN_OPTIONS}
                  onChange={(value) => setInviteLevel(value as SpaceShareLevel)}
                  disabled={!canManageSharing}
                  appearance="spaces"
                  compact
                  minWidth={160}
                />
              </div>
              <button
                type="button"
                disabled={!inviteQuery.trim() || !canManageSharing}
                onClick={() => void handleInvite()}
                className="button-glass-accent body-3 h-spacing-8 rounded-spacing-2 px-spacing-3 shrink-0 font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Invite
              </button>
            </div>
            {dualNavigatorActive && activeViewId ? (
              <label className="mt-spacing-2 flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
                <span className="body-3 text-foreground inline-flex flex-col">
                  <span>Restrict to this view</span>
                  <span className="text-muted-foreground text-[10px]">
                    Member sees only {activeViewName ?? 'this view'}
                  </span>
                </span>
                <Switch
                  checked={restrictToCurrentView}
                  disabled={!canManageSharing}
                  onCheckedChange={setRestrictToCurrentView}
                />
              </label>
            ) : null}
            {!canManageSharing ? (
              <p className="body-3 mt-spacing-2 text-muted-foreground">
                Only organization owners and admins can share spaces or views.
              </p>
            ) : null}
            {showWorkspacePeopleSharing && inviteCandidates.length > 0 && (
              <div className="mt-2 space-y-1">
                {inviteCandidates.map((entry) => (
                  <button
                    key={entry.participant_id}
                    type="button"
                    onClick={() => setInviteQuery(entry.email || entry.display_name)}
                    className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs"
                  >
                    <RosterMemberAvatar entry={entry} size={20} />
                    <span className="text-foreground">{entry.display_name}</span>
                    <span className="text-muted-foreground">{entry.email ?? ''}</span>
                  </button>
                ))}
              </div>
            )}
            {entityType === 'item' && sharedEmailInvites.length > 0 && (
              <div className="mt-2 space-y-1">
                {sharedEmailInvites.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between rounded border border-[var(--color-border)] px-2 py-1.5"
                  >
                    <span className="body-3 text-foreground truncate">
                      {share.invited_email ?? 'Invited email'}
                    </span>
                    <span className="body-3 text-muted-foreground">Invite sent</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/*
          External/public link sharing for spaces and views remains paused.
          Item/doc public links were re-enabled (rendered in the docMode section
          below). Still paused:
          - "Share link with anyone" for whole spaces and views (`/shared/space/:token`)
          - view-scoped Docs "Allow opening docs" switch
          - external email invites

          See `.documentation/sharing/external-sharing-paused.md`.
        */}

        {dualNavigatorActive && dualScope === 'view' ? (
          <div className="px-spacing-6 pb-spacing-4">
            <button
              type="button"
              onClick={() => setDualScope('space')}
              className="hover:bg-hover-subtle px-spacing-4 py-spacing-3 flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] text-left transition-colors"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="body-2 text-foreground font-semibold">Share this Space</span>
                <span className="body-3 text-muted-foreground">All views</span>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
            </button>
          </div>
        ) : null}

        {docMode && entityType === 'item' && (
          <div className="px-spacing-6 pt-spacing-3">
            <label className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
              <span className="body-3 text-foreground inline-flex flex-col">
                <span className="inline-flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                  Share link with anyone
                </span>
                <span className="text-muted-foreground text-[10px]">
                  Anyone with the link can view this doc
                </span>
              </span>
              <Switch
                checked={shareLinkEnabled}
                disabled={!canManageSharing || shareLinkBusy}
                onCheckedChange={(checked) => void handleToggleShareLink(checked)}
              />
            </label>
            {shareLinkUrl && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareLinkUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="input-glass body-3 text-foreground h-spacing-8 rounded-spacing-2 px-spacing-3 py-spacing-1 min-w-0 flex-1"
                />
                <button
                  type="button"
                  onClick={() => void handleCopyShareLink()}
                  className="button-glass-blue body-3 h-spacing-8 rounded-spacing-2 px-spacing-3 shrink-0 font-medium"
                >
                  Copy link
                </button>
              </div>
            )}
          </div>
        )}

        {showWorkspacePeopleSharing ? (
          <div className="px-spacing-6 py-spacing-4 max-h-[44vh] flex-1 overflow-y-auto">
            <p className="body-3 text-muted-foreground mb-spacing-2">Share with</p>

            {loading ? (
              <p className="body-3 text-muted-foreground py-3 text-center">Loading…</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSharingOpen((v) => !v)}
                  className="hover:bg-hover-subtle -mx-spacing-2 flex w-full items-center gap-2 rounded px-2 py-2"
                >
                  {sharingOpen ? (
                    <ChevronDown className="icon-sm text-muted-foreground" />
                  ) : (
                    <ChevronRight className="icon-sm text-muted-foreground" />
                  )}
                  <span className="body-2 text-foreground flex-1 text-left font-medium">
                    People
                  </span>
                </button>

                {sharingOpen && (
                  <div className="mt-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => setOrgRowOpen((v) => !v)}
                      className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded px-2 py-1.5"
                    >
                      {orgRowOpen ? (
                        <ChevronDown className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                      )}
                      <span className="body-3 text-foreground flex-1 text-left">{orgName}</span>
                      <span className="body-3 text-muted-foreground">
                        {sharedOrgRow?.level ?? 'No org share'}
                      </span>
                    </button>
                    {orgRowOpen && (
                      <div className="ml-5 space-y-1">
                        {roster
                          .filter((entry) => entry.kind === 'human' && entry.user_id)
                          .map((entry) => {
                            const share = shareByUserId.get(entry.user_id!)
                            const busyKey = share?.id ?? `member:${entry.user_id}`
                            return (
                              <div
                                key={entry.participant_id}
                                className="flex items-center gap-2 rounded px-2 py-1.5"
                              >
                                <RosterMemberAvatar entry={entry} size={24} />
                                <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                                  {entry.display_name}
                                </span>
                                <div className="w-[9rem] shrink-0">
                                  <SettingsDropdown
                                    value={share?.level ?? inviteLevel}
                                    options={PERMISSION_DROPDOWN_OPTIONS}
                                    onChange={(value) => {
                                      if (!share) return
                                      void handleLevelChange(share, value as SpaceShareLevel)
                                    }}
                                    disabled={!canManageSharing || !share || busyShareIds[busyKey]}
                                    appearance="spaces"
                                    compact
                                    minWidth={160}
                                  />
                                </div>
                                <Switch
                                  checked={Boolean(share)}
                                  onCheckedChange={(checked) =>
                                    void handleToggleShare(entry, checked)
                                  }
                                  disabled={!canManageSharing || busyShareIds[busyKey]}
                                />
                              </div>
                            )
                          })}
                      </div>
                    )}

                    {sharedUsersNotInRoster.length > 0 && (
                      <div className="pt-1">
                        {sharedUsersNotInRoster.map((share) => {
                          const entry = rosterByUserId.get(share.entity_id)
                          return (
                            <div
                              key={share.id}
                              className="flex items-center gap-2 rounded px-2 py-1.5"
                            >
                              {entry ? <RosterMemberAvatar entry={entry} size={24} /> : null}
                              <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                                {entry?.display_name ?? share.entity_id}
                              </span>
                              <div className="w-[9rem] shrink-0">
                                <SettingsDropdown
                                  value={share.level}
                                  options={PERMISSION_DROPDOWN_OPTIONS}
                                  onChange={(value) =>
                                    void handleLevelChange(share, value as SpaceShareLevel)
                                  }
                                  disabled={!canManageSharing || busyShareIds[share.id]}
                                  appearance="spaces"
                                  compact
                                  minWidth={160}
                                />
                              </div>
                              <button
                                type="button"
                                className="body-3 text-muted-foreground hover:text-foreground rounded px-1"
                                onClick={() => {
                                  const rosterEntry = entry
                                  if (rosterEntry && canManageSharing) {
                                    void handleToggleShare(rosterEntry, false)
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}

        {showWorkspacePeopleSharing && entityType === 'item' ? (
          <div className="px-spacing-6 pb-spacing-5">
            <button
              type="button"
              onClick={() => void handleTogglePrivate(!itemPrivate)}
              className="button-glass-blue body-3 w-full rounded px-3 py-2 font-medium"
            >
              {itemPrivate ? 'Make Team' : 'Make Private'}
            </button>
          </div>
        ) : null}

        {showWorkspacePeopleSharing && entityType === 'space' ? (
          <div className="px-spacing-6 pb-spacing-5">
            <button
              type="button"
              onClick={() => void handleToggleSpaceVisibility(!spacePrivate)}
              className="button-glass-blue body-3 w-full rounded px-3 py-2 font-medium"
            >
              {spacePrivate ? 'Make Team' : 'Make Private'}
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
