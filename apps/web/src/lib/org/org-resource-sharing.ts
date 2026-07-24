'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { backendGet } from '@/lib/api/backend-client'
import {
  deleteProgramShare,
  listProgramShares,
  updateProgram,
  upsertProgramShare,
  type ProgramShare,
  type ProgramVisibility,
} from '@/lib/programs'
import { createClient } from '@/lib/supabase/client'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { orgService, type OrgMember } from './org-api'
import { useOrgStore } from './org-context-store'
import { ORG_TOAST_ERRORS } from './org-toast-errors'

export type ShareResourceType = 'campaign' | 'brain' | 'program'
export type SharePermission = 'view' | 'edit'

export const SHARE_PERMISSION_OPTIONS: { value: SharePermission; label: string }[] = [
  { value: 'view', label: 'View only' },
  { value: 'edit', label: 'Full edit' },
]

export const PROGRAM_SHARE_PERMISSION_OPTIONS: { value: SharePermission; label: string }[] = [
  { value: 'view', label: 'Viewer' },
  { value: 'edit', label: 'Editor' },
]

export const PROGRAM_VISIBILITY_OPTIONS: { value: ProgramVisibility; label: string }[] = [
  { value: 'workspace', label: 'Workspace' },
  { value: 'private', label: 'Private' },
  { value: 'selected', label: 'Selected people' },
]

export function getSharePermissionOptions(resourceType: ShareResourceType) {
  return resourceType === 'program' ? PROGRAM_SHARE_PERMISSION_OPTIONS : SHARE_PERMISSION_OPTIONS
}

export interface MemberShareState {
  member: OrgMember
  enabled: boolean
  permission: SharePermission
  saving: boolean
  brainShareId?: string | null
  programShareId?: string | null
}

export function brainLevelToPermission(level: 'view' | 'query' | 'train'): SharePermission {
  return level === 'view' ? 'view' : 'edit'
}

export function permissionToBrainLevel(permission: SharePermission): 'view' | 'query' {
  return permission === 'view' ? 'view' : 'query'
}

export function getOrgMemberName(member: OrgMember): string {
  return member.profiles?.full_name || 'Unknown'
}

export function getOrgMemberInitials(member: OrgMember): string {
  const name = member.profiles?.full_name
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  return parts.length > 1
    ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

export function useOrgResourceSharing({
  open,
  resourceType,
  resourceId,
}: {
  open: boolean
  resourceType: ShareResourceType
  resourceId: string
}) {
  const { activeOrgId } = useOrgStore()
  const [loading, setLoading] = useState(true)
  const [memberStates, setMemberStates] = useState<MemberShareState[]>([])
  const [peopleOpen, setPeopleOpen] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [ownerAvatarUrls, setOwnerAvatarUrls] = useState<string[]>([])
  const [ownerAvatarIndex, setOwnerAvatarIndex] = useState(0)
  const [programVisibility, setProgramVisibility] = useState<ProgramVisibility>('workspace')
  const [visibilitySaving, setVisibilitySaving] = useState(false)
  const [canManageShares, setCanManageShares] = useState(true)

  const ownerLabel =
    resourceType === 'campaign' ? 'Campaign' : resourceType === 'brain' ? 'Brain' : 'Program'

  useEffect(() => {
    if (!open) {
      setOwnerAvatarUrls([])
      setOwnerAvatarIndex(0)
      return
    }
    const supabase = createClient()
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const meta = user.user_metadata as Record<string, unknown>
      const metaAvatar = typeof meta.avatar_url === 'string' ? meta.avatar_url.trim() : ''
      const metaPicture = typeof meta.picture === 'string' ? meta.picture.trim() : ''
      const profile = await backendGet<{ avatar_url?: string | null }>('/api/profile').catch(
        () => null,
      )
      const profileUrl = typeof profile?.avatar_url === 'string' ? profile.avatar_url.trim() : ''
      const ordered = [profileUrl, metaAvatar, metaPicture].filter((u) => u.length > 0)
      setOwnerAvatarIndex(0)
      setOwnerAvatarUrls(Array.from(new Set(ordered)))
    })()
  }, [open])

  const loadData = useCallback(async () => {
    if (!activeOrgId) return
    setLoading(true)
    try {
      const membersRes = await orgService.listMembers(activeOrgId)
      const active = (membersRes.members ?? []).filter(
        (member) => member.status === 'active' && member.role !== 'owner',
      )

      if (resourceType === 'campaign') {
        const permsRes = await orgService.listCampaignPermissions(activeOrgId, resourceId)
        const permsByMember = new Map<string, SharePermission>()
        for (const permission of permsRes.permissions ?? []) {
          permsByMember.set(permission.org_member_id, permission.permission)
        }
        setMemberStates(
          active.map((member) => ({
            member,
            enabled: permsByMember.has(member.id),
            permission: permsByMember.get(member.id) ?? 'view',
            saving: false,
          })),
        )
        setCanManageShares(true)
      } else if (resourceType === 'program') {
        const sharesRes = await listProgramShares(resourceId)
        setProgramVisibility(sharesRes.visibility)
        setCanManageShares(sharesRes.can_manage_shares)
        const sharesByUser = new Map<string, ProgramShare>()
        for (const share of sharesRes.shares ?? []) {
          if (share.entity_type === 'user') sharesByUser.set(share.entity_id, share)
        }
        setMemberStates(
          active.map((member) => {
            const share = sharesByUser.get(member.user_id)
            return {
              member,
              enabled: Boolean(share),
              permission: share?.level ?? 'view',
              saving: false,
              programShareId: share?.id ?? null,
            }
          }),
        )
      } else {
        const sharesRes = await orgService.listBrainShares(activeOrgId)
        const sharesByUser = new Map<string, { id: string; level: 'view' | 'query' | 'train' }>()
        for (const share of sharesRes.permissions ?? []) {
          if (
            share.brain_id === resourceId &&
            share.entity_type === 'user' &&
            typeof share.entity_id === 'string'
          ) {
            sharesByUser.set(share.entity_id, { id: share.id, level: share.level })
          }
        }
        setMemberStates(
          active.map((member) => {
            const share = sharesByUser.get(member.user_id)
            return {
              member,
              enabled: Boolean(share),
              permission: share ? brainLevelToPermission(share.level) : 'view',
              saving: false,
              brainShareId: share?.id ?? null,
            }
          }),
        )
        setCanManageShares(true)
      }
    } catch (error) {
      toast.error(sanitizeUserError(error, ORG_TOAST_ERRORS.LOAD_SHARES_FAILED.userMessage))
    } finally {
      setLoading(false)
    }
  }, [activeOrgId, resourceType, resourceId])

  useEffect(() => {
    if (open) void loadData()
  }, [open, loadData])

  const setSaving = (memberId: string, saving: boolean) => {
    setMemberStates((prev) =>
      prev.map((state) => (state.member.id === memberId ? { ...state, saving } : state)),
    )
  }

  const handleToggle = async (memberId: string, enabled: boolean) => {
    if (!activeOrgId) return
    const state = memberStates.find((item) => item.member.id === memberId)
    if (!state) return

    setSaving(memberId, true)
    setMemberStates((prev) =>
      prev.map((item) => (item.member.id === memberId ? { ...item, enabled } : item)),
    )

    try {
      if (enabled) {
        if (resourceType === 'brain') {
          const res = await orgService.upsertBrainShare(activeOrgId, resourceId, {
            entity_type: 'user',
            entity_id: state.member.user_id,
            level: permissionToBrainLevel(state.permission),
          })
          setMemberStates((prev) =>
            prev.map((item) =>
              item.member.id === memberId
                ? { ...item, brainShareId: res.permission.id, permission: state.permission }
                : item,
            ),
          )
        } else if (resourceType === 'program') {
          const share = await upsertProgramShare(resourceId, {
            entity_type: 'user',
            entity_id: state.member.user_id,
            level: state.permission,
          })
          setMemberStates((prev) =>
            prev.map((item) =>
              item.member.id === memberId
                ? { ...item, programShareId: share.id, permission: state.permission }
                : item,
            ),
          )
        } else {
          await orgService.upsertCampaignPermission(
            activeOrgId,
            resourceId,
            memberId,
            state.permission,
          )
        }
      } else if (resourceType === 'brain') {
        if (state.brainShareId) {
          await orgService.removeBrainShare(activeOrgId, resourceId, state.brainShareId)
        }
        setMemberStates((prev) =>
          prev.map((item) =>
            item.member.id === memberId ? { ...item, brainShareId: null } : item,
          ),
        )
      } else if (resourceType === 'program') {
        if (state.programShareId) {
          await deleteProgramShare(resourceId, state.programShareId)
        }
        setMemberStates((prev) =>
          prev.map((item) =>
            item.member.id === memberId ? { ...item, programShareId: null } : item,
          ),
        )
      } else {
        await orgService.removeCampaignPermission(activeOrgId, resourceId, memberId)
      }
    } catch (error) {
      setMemberStates((prev) =>
        prev.map((item) => (item.member.id === memberId ? { ...item, enabled: !enabled } : item)),
      )
      toast.error(sanitizeUserError(error, ORG_TOAST_ERRORS.UPDATE_PERMISSION_FAILED.userMessage))
    } finally {
      setSaving(memberId, false)
    }
  }

  const handlePermissionChange = async (memberId: string, permission: SharePermission) => {
    if (!activeOrgId) return
    const state = memberStates.find((item) => item.member.id === memberId)
    if (!state) return

    setMemberStates((prev) =>
      prev.map((item) => (item.member.id === memberId ? { ...item, permission } : item)),
    )
    if (!state.enabled) return

    setSaving(memberId, true)
    try {
      if (resourceType === 'brain') {
        const res = await orgService.upsertBrainShare(activeOrgId, resourceId, {
          entity_type: 'user',
          entity_id: state.member.user_id,
          level: permissionToBrainLevel(permission),
        })
        setMemberStates((prev) =>
          prev.map((item) =>
            item.member.id === memberId ? { ...item, brainShareId: res.permission.id } : item,
          ),
        )
      } else if (resourceType === 'program') {
        const share = await upsertProgramShare(resourceId, {
          entity_type: 'user',
          entity_id: state.member.user_id,
          level: permission,
        })
        setMemberStates((prev) =>
          prev.map((item) =>
            item.member.id === memberId ? { ...item, programShareId: share.id } : item,
          ),
        )
      } else {
        await orgService.upsertCampaignPermission(activeOrgId, resourceId, memberId, permission)
      }
    } catch (error) {
      setMemberStates((prev) =>
        prev.map((item) =>
          item.member.id === memberId ? { ...item, permission: state.permission } : item,
        ),
      )
      toast.error(sanitizeUserError(error, ORG_TOAST_ERRORS.UPDATE_PERMISSION_FAILED.userMessage))
    } finally {
      setSaving(memberId, false)
    }
  }

  const handleVisibilityChange = async (visibility: ProgramVisibility) => {
    if (resourceType !== 'program') return
    const previous = programVisibility
    setProgramVisibility(visibility)
    setVisibilitySaving(true)
    try {
      await updateProgram(resourceId, { visibility })
      // Keep ACL rows when returning to workspace (ignored until Private/Selected).
    } catch (error) {
      setProgramVisibility(previous)
      toast.error(sanitizeUserError(error, ORG_TOAST_ERRORS.UPDATE_PERMISSION_FAILED.userMessage))
    } finally {
      setVisibilitySaving(false)
    }
  }

  const handleInvite = async () => {
    if (!activeOrgId) return
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    setInviting(true)
    try {
      await orgService.invite(activeOrgId, { email, role: 'editor' })
      toast.success(`Invitation sent to ${email}`)
      setInviteEmail('')
      void loadData()
    } catch (error) {
      toast.error(sanitizeUserError(error, ORG_TOAST_ERRORS.SEND_INVITATION_FAILED.userMessage))
    } finally {
      setInviting(false)
    }
  }

  const sharedCount = useMemo(
    () => memberStates.filter((state) => state.enabled).length,
    [memberStates],
  )

  return {
    activeOrgId,
    canManageShares,
    handleInvite,
    handlePermissionChange,
    handleToggle,
    handleVisibilityChange,
    inviteEmail,
    inviting,
    loading,
    memberStates,
    ownerAvatarSrc: ownerAvatarUrls[ownerAvatarIndex] ?? null,
    ownerLabel,
    peopleOpen,
    permissionOptions: getSharePermissionOptions(resourceType),
    programVisibility,
    setInviteEmail,
    setOwnerAvatarIndex,
    setPeopleOpen,
    sharedCount,
    visibilitySaving,
  }
}
