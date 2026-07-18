'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { SettingsDropdown } from '@/components/ui/forms/SettingsDropdown'
import { useOrgStore } from '@/lib/org/org-context-store'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { SPACES_SHARE_TOAST_ERRORS } from '../config/spaces-toast-errors.config'
import {
  deleteSpaceViewShare,
  fetchSpaceViewShares,
  upsertSpaceViewShare,
  type SpaceShareEntityType,
  type SpaceShareLevel,
  type SpaceViewShareRecord,
} from '../services/spaces.service'
import { RosterMemberAvatar } from './cells/AssigneeCell'

interface ViewShareModalProps {
  open: boolean
  onClose: () => void
  spaceId: string
  viewId: string
  viewName: string
  /** Current org's roster — used to resolve display names + autocomplete. */
  roster?: TeamRosterEntry[]
}

const PERMISSION_OPTIONS: ReadonlyArray<{ value: SpaceShareLevel; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'edit', label: 'Edit' },
  { value: 'view', label: 'View only' },
]

const PERMISSION_DROPDOWN_OPTIONS = PERMISSION_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}))

const ORG_PERMISSION_DROPDOWN_OPTIONS = [
  { value: '', label: 'Off' },
  ...PERMISSION_DROPDOWN_OPTIONS,
]

export function ViewShareModal({
  open,
  onClose,
  spaceId,
  viewId,
  viewName,
  roster = [],
}: ViewShareModalProps) {
  const { activeOrgId, getActiveOrg } = useOrgStore()
  const [loading, setLoading] = useState(false)
  const [shares, setShares] = useState<SpaceViewShareRecord[]>([])
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteLevel, setInviteLevel] = useState<SpaceShareLevel>('view')
  const [busyShareIds, setBusyShareIds] = useState<Record<string, boolean>>({})

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchSpaceViewShares(spaceId, viewId)
      setShares(res.shares)
    } catch (err) {
      toast.error(
        sanitizeUserError(err, SPACES_SHARE_TOAST_ERRORS.LOAD_VIEW_SHARES_FAILED.userMessage),
      )
    } finally {
      setLoading(false)
    }
  }, [spaceId, viewId])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  const sharesByEntityId = useMemo(() => {
    const map = new Map<string, SpaceViewShareRecord>()
    for (const share of shares) map.set(`${share.entity_type}:${share.entity_id}`, share)
    return map
  }, [shares])

  const userCandidates = useMemo(() => {
    const q = inviteQuery.trim().toLowerCase()
    return roster.filter((entry) => {
      if (entry.kind !== 'human' || !entry.user_id) return false
      if (sharesByEntityId.has(`user:${entry.user_id}`)) return false
      if (!q) return true
      return (entry.display_name ?? '').toLowerCase().includes(q)
    })
  }, [roster, inviteQuery, sharesByEntityId])

  const upsert = useCallback(
    async (
      entityType: SpaceShareEntityType,
      entityId: string,
      level: SpaceShareLevel,
    ): Promise<void> => {
      const key = `upsert:${entityType}:${entityId}`
      setBusyShareIds((prev) => ({ ...prev, [key]: true }))
      try {
        const next = await upsertSpaceViewShare(spaceId, viewId, {
          entity_type: entityType,
          entity_id: entityId,
          level,
        })
        setShares((prev) => {
          const without = prev.filter(
            (row) => !(row.entity_type === entityType && row.entity_id === entityId),
          )
          return [...without, next]
        })
        setInviteQuery('')
      } catch (err) {
        toast.error(sanitizeUserError(err, SPACES_SHARE_TOAST_ERRORS.SHARE_VIEW_FAILED.userMessage))
      } finally {
        setBusyShareIds((prev) => {
          const { [key]: _drop, ...rest } = prev
          return rest
        })
      }
    },
    [spaceId, viewId],
  )

  const remove = useCallback(
    async (share: SpaceViewShareRecord): Promise<void> => {
      setBusyShareIds((prev) => ({ ...prev, [share.id]: true }))
      try {
        await deleteSpaceViewShare(spaceId, viewId, share.id)
        setShares((prev) => prev.filter((row) => row.id !== share.id))
      } catch (err) {
        toast.error(
          sanitizeUserError(err, SPACES_SHARE_TOAST_ERRORS.REMOVE_VIEW_SHARE_FAILED.userMessage),
        )
      } finally {
        setBusyShareIds((prev) => {
          const { [share.id]: _drop, ...rest } = prev
          return rest
        })
      }
    },
    [spaceId, viewId],
  )

  const orgShare = activeOrgId ? (sharesByEntityId.get(`org:${activeOrgId}`) ?? null) : null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div
            className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border bg-[var(--color-card)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-spacing-6 pt-spacing-5 pb-spacing-3 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="title-h6 text-foreground">
                    Share view
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1 truncate">
                    {viewName}
                  </DialogPrimitive.Description>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-icon-bare shrink-0"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 space-y-spacing-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
              {/* Invite row */}
              <div className="space-y-spacing-2">
                <label
                  htmlFor="view-share-invite-name"
                  className="body-2 text-foreground block font-medium"
                >
                  Invite by name
                </label>
                <div className="gap-spacing-2 flex items-center">
                  <input
                    id="view-share-invite-name"
                    value={inviteQuery}
                    onChange={(e) => setInviteQuery(e.target.value)}
                    placeholder="Type a teammate's name…"
                    className="input-glass body-3 text-foreground h-spacing-8 rounded-spacing-2 px-spacing-3 py-spacing-1 min-w-0 flex-1"
                  />
                  <div className="w-[9.5rem] shrink-0">
                    <SettingsDropdown
                      value={inviteLevel}
                      options={PERMISSION_DROPDOWN_OPTIONS}
                      onChange={(value) => setInviteLevel(value as SpaceShareLevel)}
                      appearance="spaces"
                      compact
                      minWidth={160}
                    />
                  </div>
                </div>
                {inviteQuery.trim().length > 0 && userCandidates.length > 0 ? (
                  <div className="border-border rounded-spacing-2 max-h-48 overflow-y-auto border">
                    {userCandidates.slice(0, 8).map((entry) => (
                      <button
                        key={entry.user_id}
                        type="button"
                        onClick={() => void upsert('user', entry.user_id!, inviteLevel)}
                        disabled={busyShareIds[`upsert:user:${entry.user_id}`]}
                        className="hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 body-3 text-foreground flex w-full items-center justify-between text-left disabled:opacity-50"
                      >
                        <span className="gap-spacing-2 flex min-w-0 items-center">
                          <RosterMemberAvatar entry={entry} size={24} />
                          <span className="truncate">{entry.display_name ?? entry.user_id}</span>
                        </span>
                        <span className="text-muted-foreground typo-caption shrink-0">Add</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Org-wide row */}
              {activeOrgId ? (
                <div className="border-border rounded-spacing-2 p-spacing-3 border">
                  <div className="gap-spacing-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="body-2 text-foreground font-medium">Whole organization</p>
                      <p className="body-4 text-muted-foreground mt-spacing-1 truncate">
                        Share this view with everyone in{' '}
                        {getActiveOrg()?.organizations?.name ?? 'this org'}
                      </p>
                    </div>
                    <div className="w-[9.5rem] shrink-0">
                      <SettingsDropdown
                        value={orgShare?.level ?? ''}
                        options={ORG_PERMISSION_DROPDOWN_OPTIONS}
                        onChange={(value) => {
                          if (!value) {
                            if (orgShare) void remove(orgShare)
                            return
                          }
                          void upsert('org', activeOrgId, value as SpaceShareLevel)
                        }}
                        appearance="spaces"
                        compact
                        minWidth={160}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Existing per-user shares */}
              <div className="space-y-spacing-2">
                <p className="body-2 text-foreground font-medium">Shared with</p>
                {loading ? (
                  <p className="body-3 text-muted-foreground">Loading…</p>
                ) : shares.filter((share) => share.entity_type === 'user').length === 0 ? (
                  <p className="body-3 text-muted-foreground">
                    No one yet. Invite teammates above.
                  </p>
                ) : (
                  <div className="space-y-spacing-1">
                    {shares
                      .filter((share) => share.entity_type === 'user')
                      .map((share) => {
                        const entry = roster.find(
                          (r) => r.kind === 'human' && r.user_id === share.entity_id,
                        )
                        const label = entry?.display_name ?? share.entity_id
                        return (
                          <div
                            key={share.id}
                            className="gap-spacing-2 border-border rounded-spacing-2 p-spacing-2 flex items-center justify-between border"
                          >
                            <span className="body-3 text-foreground gap-spacing-2 flex min-w-0 flex-1 items-center">
                              {entry ? <RosterMemberAvatar entry={entry} size={24} /> : null}
                              <span className="truncate">{label}</span>
                            </span>
                            <div className="w-[9rem] shrink-0">
                              <SettingsDropdown
                                value={share.level}
                                options={PERMISSION_DROPDOWN_OPTIONS}
                                onChange={(value) =>
                                  void upsert(
                                    share.entity_type,
                                    share.entity_id,
                                    value as SpaceShareLevel,
                                  )
                                }
                                disabled={busyShareIds[share.id]}
                                appearance="spaces"
                                compact
                                minWidth={160}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => void remove(share)}
                              disabled={busyShareIds[share.id]}
                              className="text-muted-foreground hover:bg-hover-subtle hover:text-destructive shrink-0 rounded-md p-1 disabled:opacity-50"
                              aria-label="Remove share"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
