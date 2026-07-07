'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MessageCircle, MoreHorizontal } from 'lucide-react'
import { AgentActionsMenu, type AgentTeamOption } from '@/components/agents/AgentActionsMenu'
import type { MissionAgent } from '@/lib/agents'
import {
  agentPresenceStatusDotClass,
  SYSTEM_LIKE_AGENT_KEYS,
} from '@/lib/agents/agent-team-display'
import type { Campaign } from '@/lib/campaigns'

export interface AgentGridCardMenuActions {
  onCopyId: () => void
  onOpenInNewTab: () => void
  onOpenChat: () => void
  onOpenEdit: () => void
  onOpenSkills: () => void
  onOpenComms: () => void
  onOpenAccess: () => void
  onOpenBrain: () => void
  onSetupBrain: () => void
  onDeactivate: () => void
  onFire: () => void
  onAssignmentsChanged?: () => void | Promise<void>
}

interface AgentGridCardProps {
  agent: MissionAgent
  onOpen: () => void
  onOpenChat: () => void
  onRenameSubmit: (agentKey: string, name: string) => void | Promise<void>
  menuActions: AgentGridCardMenuActions
  nonGeneralCampaigns: Campaign[]
  teams: AgentTeamOption[]
  onSelectTeam: (teamId: string | null) => void | Promise<void>
  onTeamChanged?: () => void | Promise<void>
  assignedCampaignIds?: string[]
  showAccess: boolean
  hasBrain: boolean
  fireLabel: string
  canRename: boolean
  canDeactivate: boolean
  canMoveTeam: boolean
  canFireAgent: boolean
  canManageCampaigns: boolean
  isFavorite: boolean
  onToggleFavorite: () => void | Promise<void>
  canFavorite: boolean
}

function canFireAgent(agent: MissionAgent): boolean {
  const level = agent.level || 'employee'
  const isEmployee = level === 'employee'
  const isManager = level === 'manager'
  return (isEmployee || isManager) && !SYSTEM_LIKE_AGENT_KEYS.has(agent.agent_key)
}

export function AgentGridCard({
  agent,
  onOpen,
  onOpenChat,
  onRenameSubmit,
  menuActions,
  nonGeneralCampaigns,
  teams,
  onSelectTeam,
  onTeamChanged,
  assignedCampaignIds,
  showAccess,
  hasBrain,
  fireLabel,
  canRename,
  canDeactivate,
  canMoveTeam,
  canFireAgent: canFirePermission,
  canManageCampaigns,
  isFavorite,
  onToggleFavorite,
  canFavorite,
}: AgentGridCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState(agent.name)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const canFire = canFirePermission && canFireAgent(agent)
  const isSystemLike = SYSTEM_LIKE_AGENT_KEYS.has(agent.agent_key)

  useEffect(() => {
    if (!renaming) setRenameDraft(agent.name)
  }, [agent.name, renaming])

  useLayoutEffect(() => {
    if (!renaming) return
    const el = renameInputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [renaming])

  const openMenuAt = (clientX: number, clientY: number) => {
    setMenuAnchor({ top: clientY, left: clientX })
    setMenuOpen(true)
  }

  const openMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    openMenuAt(rect.right - 224, rect.bottom + 4)
  }

  const commitRename = () => {
    const t = renameDraft.trim()
    if (!t || t === agent.name) {
      setRenaming(false)
      return
    }
    void Promise.resolve(onRenameSubmit(agent.agent_key, t)).then(() => {
      setRenaming(false)
    })
  }

  const displayName = renaming ? renameDraft : agent.name

  const subtitle = agent.role || agent.level || 'Agent'
  const dateLabel = new Date(agent.created_at).toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (renaming) return
        onOpen()
      }}
      onContextMenu={(e) => {
        if (renaming) return
        e.preventDefault()
        e.stopPropagation()
        openMenuAt(e.clientX, e.clientY)
      }}
      onKeyDown={(e) => {
        if (renaming) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="border-subtle group/agent-card rounded-spacing-3 flex cursor-pointer flex-col overflow-visible text-left transition-opacity hover:opacity-95"
    >
      <div className="bg-muted rounded-t-spacing-3 relative aspect-square w-full overflow-visible">
        <div className="rounded-t-spacing-3 absolute inset-0 overflow-hidden">
          {agent.image_url ? (
            <img src={agent.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="bg-muted flex h-full w-full items-center justify-center">
              <span className="title-h4 text-muted-foreground">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div
          className="pointer-events-none absolute right-2 top-2 z-10 opacity-0 transition-opacity duration-200 ease-out group-hover/agent-card:pointer-events-auto group-hover/agent-card:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="surface-card border-subtle flex flex-col items-center gap-0.5 rounded-lg border p-0.5 shadow-sm">
            <button
              type="button"
              title="Chat"
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onOpenChat()
              }}
            >
              <MessageCircle className="icon-sm" />
            </button>
            <button
              type="button"
              title="More"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={`text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                menuOpen ? 'bg-hover-subtle text-foreground' : ''
              }`}
              onClick={openMenuFromButton}
            >
              <MoreHorizontal className="icon-sm" />
            </button>
          </div>
        </div>
      </div>
      <div className="gap-spacing-1 rounded-b-spacing-3 p-spacing-2 flex min-h-0 flex-1 flex-col">
        <div
          className="gap-spacing-1 flex min-w-0 items-center justify-between"
          onClick={(e) => {
            if (renaming) e.stopPropagation()
          }}
        >
          {renaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => void commitRename()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Escape') {
                  setRenameDraft(agent.name)
                  setRenaming(false)
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  renameInputRef.current?.blur()
                }
              }}
              className="body-2 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent font-medium outline-none"
              aria-label="Agent name"
            />
          ) : (
            <span className="body-2 text-foreground min-w-0 flex-1 truncate font-medium">
              {agent.name}
            </span>
          )}
          <span className={agentPresenceStatusDotClass(agent)} aria-hidden />
        </div>
        <p className="body-4 text-muted-foreground line-clamp-2">{subtitle}</p>
        <div className="pt-spacing-1 mt-auto">
          <span className="body-4 text-muted-foreground">{dateLabel}</span>
        </div>
      </div>

      <AgentActionsMenu
        open={menuOpen}
        anchor={menuAnchor}
        agent={agent}
        isSystemLikeAgent={isSystemLike}
        onClose={() => {
          setMenuOpen(false)
          setMenuAnchor(null)
        }}
        onCopyId={menuActions.onCopyId}
        onOpenInNewTab={menuActions.onOpenInNewTab}
        onOpenChat={menuActions.onOpenChat}
        onOpenEdit={menuActions.onOpenEdit}
        onOpenSkills={menuActions.onOpenSkills}
        onOpenComms={menuActions.onOpenComms}
        onOpenAccess={menuActions.onOpenAccess}
        onOpenBrain={menuActions.onOpenBrain}
        onSetupBrain={menuActions.onSetupBrain}
        onRename={() => {
          setRenameDraft(agent.name)
          setRenaming(true)
        }}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        canFavorite={canFavorite}
        teams={teams}
        onSelectTeam={(teamId) => onSelectTeam(teamId)}
        onTeamChanged={onTeamChanged}
        onDeactivate={menuActions.onDeactivate}
        onFire={menuActions.onFire}
        showAccess={showAccess}
        hasBrain={hasBrain}
        canRename={canRename}
        canDeactivate={canDeactivate}
        canMoveTeam={canMoveTeam}
        canFire={canFire}
        canManageCampaigns={canManageCampaigns}
        nonGeneralCampaigns={nonGeneralCampaigns}
        assignedCampaignIds={assignedCampaignIds}
        onAssignmentsChanged={menuActions.onAssignmentsChanged}
        fireLabel={fireLabel}
      />
    </div>
  )
}
