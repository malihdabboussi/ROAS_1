'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { PersonActionsMenu, RemoveOrgMemberConfirmModal } from '@/components/agents'
import { personDmAbsoluteUrl, personDmUrl } from '@/lib/agents'
import { orgService, peopleCache, type OrgMember, type OrgPerson } from '@/lib/org'
import { useAccountSettingsModal } from '@/lib/settings/account-settings-modal-context'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

interface SidebarPersonRowProps {
  person: OrgPerson
  isActive: boolean
  unreadCount?: number
  activeOrgId: string | null
  currentUserId: string | null
  canManageMembers: boolean
  getMemberByUserId: (userId: string) => OrgMember | null
  onMembersChanged: () => void
  onOpenMessage?: () => void
}

export function SidebarPersonRow({
  person,
  isActive,
  unreadCount = 0,
  activeOrgId,
  currentUserId,
  canManageMembers,
  getMemberByUserId,
  onMembersChanged,
  onOpenMessage,
}: SidebarPersonRowProps) {
  const router = useRouter()
  const { openAccountSettings } = useAccountSettingsModal()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [roleBusy, setRoleBusy] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const href = personDmUrl(person.user_id)
  const isSelf = currentUserId != null && person.user_id === currentUserId
  const isOwner = person.org_role === 'owner'
  const member = getMemberByUserId(person.user_id)
  const canChangeRole = canManageMembers && !isSelf && !isOwner && !!member
  const canRemove = canManageMembers && !isSelf && !isOwner && !!member

  const openMenuAt = (clientX: number, clientY: number) => {
    setMenuAnchor({ top: clientY, left: clientX })
    setMenuOpen(true)
  }

  const openMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuAnchor({ top: rect.bottom + 4, left: rect.right - 224 })
    setMenuOpen(true)
  }

  const closeMenu = () => {
    setMenuOpen(false)
    setMenuAnchor(null)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(personDmAbsoluteUrl(person.user_id))
      toast.success('Link copied')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleChangeRole = async (role: string) => {
    if (!activeOrgId || !member || !canChangeRole) return
    setRoleBusy(true)
    try {
      await orgService.changeMemberRole(activeOrgId, member.id, role)
      toast.success('Role updated')
      void peopleCache.reload()
      onMembersChanged()
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to change role'))
    } finally {
      setRoleBusy(false)
    }
  }

  const handleRemoveConfirm = async () => {
    if (!activeOrgId || !member || !canRemove) return
    setRemoving(true)
    try {
      await orgService.removeMember(activeOrgId, member.id)
      setRemoveOpen(false)
      toast.success(`${person.display_name} removed`)
      void peopleCache.reload()
      onMembersChanged()
      if (
        typeof window !== 'undefined' &&
        window.location.search.includes(`dm=${encodeURIComponent(person.user_id)}`)
      ) {
        router.push('/team')
      }
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to remove member'))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div
      className="group/person-row relative flex items-center"
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openMenuAt(e.clientX, e.clientY)
      }}
    >
      <Link
        href={href}
        onClick={() => onOpenMessage?.()}
        className={`hub-dock-flyout-row pr-spacing-8 ${
          isActive ? 'hub-dock-flyout-row-active' : ''
        }`}
      >
        {person.avatar_url ? (
          <img
            src={person.avatar_url}
            alt=""
            className="h-5 w-5 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="bg-muted text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
            {person.display_name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span
          className={`min-w-0 flex-1 truncate ${unreadCount > 0 ? 'text-foreground font-semibold' : ''}`}
        >
          {person.display_name}
        </span>
        {unreadCount > 0 ? (
          <span className="bg-primary text-primary-foreground inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
        {person.status_emoji ? (
          <span className="shrink-0 text-xs" aria-hidden>
            {person.status_emoji}
          </span>
        ) : null}
      </Link>
      <div className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
        <button
          type="button"
          aria-label="Person actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={openMenuFromButton}
          className={`absolute inset-0 flex items-center justify-center rounded p-0.5 text-[var(--color-muted-foreground)] transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover/person-row:opacity-100'
          }`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      <PersonActionsMenu
        open={menuOpen}
        anchor={menuAnchor}
        displayName={person.display_name}
        orgRole={person.org_role}
        canManageMembers={canManageMembers}
        canChangeRole={canChangeRole}
        canRemove={canRemove}
        roleBusy={roleBusy}
        onClose={closeMenu}
        onCopyLink={() => void copyLink()}
        onOpenInNewTab={() => {
          openInNewTab(personDmUrl(person.user_id))
        }}
        onOpenMessage={() => {
          onOpenMessage?.()
          router.push(href)
        }}
        onChangeRole={(role) => void handleChangeRole(role)}
        onRemove={() => setRemoveOpen(true)}
        onOpenOrgMembers={() => openAccountSettings('organization')}
      />

      <RemoveOrgMemberConfirmModal
        open={removeOpen}
        displayName={person.display_name}
        removing={removing}
        onClose={() => {
          if (!removing) setRemoveOpen(false)
        }}
        onConfirm={() => void handleRemoveConfirm()}
      />
    </div>
  )
}
