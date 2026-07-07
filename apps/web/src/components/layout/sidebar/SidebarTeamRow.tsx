'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { TeamActionsMenu } from '@/components/agents'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { teamAbsoluteUrl, teamPageUrl, type AgentTeam } from '@/lib/agents'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

interface SidebarTeamRowProps {
  team: AgentTeam
  isActive: boolean
  canEdit: boolean
  canManageMembers: boolean
  onRename: (teamId: string, name: string) => Promise<AgentTeam>
  onRecolor: (teamId: string, color: string) => Promise<AgentTeam>
  onReicon: (teamId: string, icon: string) => Promise<AgentTeam>
  onRemove: (teamId: string) => Promise<void>
}

export function SidebarTeamRow({
  team,
  isActive,
  canEdit,
  canManageMembers,
  onRename,
  onRecolor,
  onReicon,
  onRemove,
}: SidebarTeamRowProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState(team.name)

  const teamHref = teamPageUrl(team.id)
  const palette = getIconColor(team.color)

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
      await navigator.clipboard.writeText(teamAbsoluteUrl(team.id))
      toast.success('Link copied')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleDelete = async () => {
    if (team.is_system || !canEdit) return
    if (!window.confirm(`Delete team "${team.name}"? Agents are reassigned to General.`)) {
      return
    }
    try {
      await onRemove(team.id)
      toast.success('Team deleted')
      if (
        typeof window !== 'undefined' &&
        (window.location.pathname === teamHref ||
          window.location.pathname.startsWith(`${teamHref}/`))
      ) {
        router.push('/team/teams')
      }
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not delete team.'))
    }
  }

  const patchAppearance = async (patch: { icon?: string; color?: string }) => {
    try {
      if (patch.icon) await onReicon(team.id, patch.icon)
      if (patch.color) await onRecolor(team.id, patch.color)
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not update team.'))
    }
  }

  if (renaming) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-1.5">
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${palette.glassClass}`}
        >
          <LucideIcon name={team.icon || 'users'} className={`h-3 w-3 ${palette.textColor}`} />
        </span>
        <input
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const t = renameDraft.trim()
              if (t && t !== team.name) void onRename(team.id, t)
              setRenaming(false)
            }
            if (e.key === 'Escape') {
              setRenameDraft(team.name)
              setRenaming(false)
            }
          }}
          onBlur={() => {
            const t = renameDraft.trim()
            if (t && t !== team.name) void onRename(team.id, t)
            setRenaming(false)
          }}
          autoFocus
          className="body-3 min-w-0 flex-1 bg-transparent text-[var(--color-foreground)] outline-none"
        />
      </div>
    )
  }

  return (
    <div
      className="group/team-row relative flex items-center"
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openMenuAt(e.clientX, e.clientY)
      }}
    >
      <Link
        href={teamHref}
        className={`nav-glass-hover-purple flex w-full items-center gap-2 rounded-lg py-1.5 pl-3 pr-8 transition-all ${
          isActive ? 'home-sidebar-item-active' : 'text-[var(--color-muted-foreground)]'
        }`}
      >
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${palette.glassClass}`}
        >
          <LucideIcon name={team.icon || 'users'} className={`h-3 w-3 ${palette.textColor}`} />
        </span>
        <span className="body-3 min-w-0 flex-1 truncate">{team.name}</span>
      </Link>
      <div className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
        <button
          type="button"
          aria-label="Team actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={openMenuFromButton}
          className={`absolute inset-0 flex items-center justify-center rounded p-0.5 text-[var(--color-muted-foreground)] transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover/team-row:opacity-100'
          }`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      <TeamActionsMenu
        open={menuOpen}
        anchor={menuAnchor}
        teamName={team.name}
        teamIcon={team.icon || 'users'}
        teamColor={team.color}
        isSystem={team.is_system}
        canEdit={canEdit}
        canManageMembers={canManageMembers}
        onClose={closeMenu}
        onCopyLink={() => void copyLink()}
        onOpenInNewTab={() => {
          openInNewTab(teamPageUrl(team.id))
        }}
        onOpenOverview={() => router.push(teamPageUrl(team.id))}
        onOpenAnalytics={() => router.push(teamPageUrl(team.id, 'analytics'))}
        onOpenAccess={() => router.push(teamPageUrl(team.id, 'access'))}
        onRename={() => {
          setRenameDraft(team.name)
          setRenaming(true)
        }}
        onAddMembers={() => {
          router.push(teamPageUrl(team.id, 'overview', { addMembers: true }))
        }}
        onPatchAppearance={(patch) => void patchAppearance(patch)}
        onDelete={() => void handleDelete()}
      />
    </div>
  )
}
