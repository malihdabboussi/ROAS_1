'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MoreHorizontal, Star } from 'lucide-react'
import { AgentActionsMenu } from '@/components/agents/AgentActionsMenu'
import {
  agentPresenceStatusDotClass,
  type AgentMenuContext,
  type MissionAgent,
  type MissionAgentSidebar,
} from '@/lib/agents'

interface SidebarAgentDmRowProps {
  agent: MissionAgentSidebar
  isActive: boolean
  isFavorite: boolean
  getAgentMenuContext: (agent: MissionAgent) => AgentMenuContext
  onRename: (agentKey: string, name: string) => void | Promise<void>
}

export function SidebarAgentDmRow({
  agent,
  isActive,
  isFavorite,
  getAgentMenuContext,
  onRename,
}: SidebarAgentDmRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState(agent.name)

  const agentFull = agent as MissionAgent
  // Resolved lazily on menu open: getAgentMenuContext kicks off the agent
  // brain-status fetch, so calling it for every row on every render caused an
  // N+1 request burst per flyout open.
  const ctx = menuOpen ? getAgentMenuContext(agentFull) : null

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

  const href = `/team?agent=${encodeURIComponent(agent.agent_key)}&tab=chat`

  if (renaming) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-3 py-1.5">
        <span className="inline-block h-5 w-5 shrink-0" aria-hidden />
        <input
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const t = renameDraft.trim()
              if (t && t !== agent.name) void onRename(agent.agent_key, t)
              setRenaming(false)
            }
            if (e.key === 'Escape') {
              setRenameDraft(agent.name)
              setRenaming(false)
            }
          }}
          onBlur={() => {
            const t = renameDraft.trim()
            if (t && t !== agent.name) void onRename(agent.agent_key, t)
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
      className="group/agent-dm relative flex items-center"
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openMenuAt(e.clientX, e.clientY)
      }}
    >
      <Link
        href={href}
        className={`hub-dock-flyout-row pr-spacing-8 ${
          isActive ? 'hub-dock-flyout-row-active' : ''
        }`}
      >
        {agent.image_url ? (
          <img
            src={agent.image_url}
            alt=""
            className="h-5 w-5 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="bg-muted text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
            {agent.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate" title={agent.name}>{agent.name}</span>
        <span className={agentPresenceStatusDotClass(agent)} aria-hidden />
      </Link>
      <div className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
        {isFavorite ? (
          <Star
            className="pointer-events-none h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400 opacity-100 transition-opacity group-hover/agent-dm:opacity-0"
            aria-label="Favorite"
          />
        ) : null}
        <button
          type="button"
          aria-label="Agent actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={openMenuFromButton}
          className={`absolute inset-0 flex items-center justify-center rounded p-0.5 text-[var(--color-muted-foreground)] transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover/agent-dm:opacity-100'
          }`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {ctx ? (
        <AgentActionsMenu
          open={menuOpen}
          anchor={menuAnchor}
          agent={agentFull}
          isSystemLikeAgent={ctx.isSystemLikeAgent}
          onClose={() => {
            setMenuOpen(false)
            setMenuAnchor(null)
          }}
          onCopyId={ctx.menuActions.onCopyId}
          onOpenInNewTab={ctx.menuActions.onOpenInNewTab}
          onOpenChat={ctx.menuActions.onOpenChat}
          onOpenEdit={ctx.menuActions.onOpenEdit}
          onOpenSkills={ctx.menuActions.onOpenSkills}
          onOpenComms={ctx.menuActions.onOpenComms}
          onOpenAccess={ctx.menuActions.onOpenAccess}
          onOpenBrain={ctx.menuActions.onOpenBrain}
          onSetupBrain={ctx.menuActions.onSetupBrain}
          onRename={() => {
            setRenameDraft(agent.name)
            setRenaming(true)
          }}
          isFavorite={ctx.isFavorite}
          onToggleFavorite={ctx.onToggleFavorite}
          canFavorite={ctx.canFavorite}
          teams={ctx.teams}
          onSelectTeam={(teamId) => ctx.onSelectTeam(agent.agent_key, teamId)}
          onDeactivate={ctx.menuActions.onDeactivate}
          onFire={ctx.menuActions.onFire}
          showAccess={ctx.showAccess}
          hasBrain={ctx.hasBrain}
          canRename={ctx.canRename}
          canDeactivate={ctx.canDeactivate}
          canMoveTeam={ctx.canMoveTeam}
          canFire={ctx.canFireAgent}
          canManageCampaigns={ctx.canManageCampaigns}
          nonGeneralCampaigns={ctx.nonGeneralCampaigns}
          onAssignmentsChanged={ctx.menuActions.onAssignmentsChanged}
          fireLabel={ctx.fireLabel}
        />
      ) : null}
    </div>
  )
}
