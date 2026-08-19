'use client'

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { AgentActionsMenu, type AgentTeamOption } from '@/components/agents/AgentActionsMenu'
import type { AgentMenuContext, MissionAgent } from '@/lib/agents'
import {
  agentPresenceStatusDotClass,
  SYSTEM_LIKE_AGENT_KEYS,
} from '@/lib/agents/agent-team-display'
import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'
import { AgentListModelPicker } from './AgentListModelPicker'
import { AgentsGroupSectionHeader } from './AgentsGroupSectionHeader'

export interface AgentsListGroup {
  key: string
  label: string
  color: string
  icon?: string | null
  /** When set (model groups), header uses composer chip glass instead of team badge. */
  modelChipClass?: string
  items: MissionAgent[]
}

interface AgentsListViewProps {
  agents: MissionAgent[]
  groups?: AgentsListGroup[] | null
  collapsedGroupKeys?: Set<string>
  onToggleGroup?: (groupKey: string) => void
  modelOptions: LlmModelOption[]
  onOpen: (agentKey: string) => void
  onRenameAgent: (agentKey: string, name: string) => void | Promise<void>
  onModelChange: (
    agentKey: string,
    modelId: string,
    modelSettings: ChatModelSettings | null,
  ) => void | Promise<void>
  canChangeModel: (agent: MissionAgent) => boolean
  getAgentMenuContext: (agent: MissionAgent) => AgentMenuContext
  selectedAgentKey: string | null
  assignedCampaignIdsForSelected?: string[]
  hasBrainForSelected: boolean
}

const LIST_GRID_COLS = 'grid-cols-[1.15fr_1.55fr_1fr_1fr_1fr_2.5rem]'

function canFireAgent(agent: MissionAgent): boolean {
  const level = agent.level || 'employee'
  const isEmployee = level === 'employee'
  const isManager = level === 'manager'
  return (isEmployee || isManager) && !SYSTEM_LIKE_AGENT_KEYS.has(agent.agent_key)
}

function statusLabel(agent: MissionAgent): string {
  if (agent.is_active === false) return 'Offline'
  if (agent.status === 'working') return 'Working'
  if (agent.status === 'online') return 'Online'
  if (agent.status === 'idle') return 'Idle'
  return 'Offline'
}

function AgentListRow({
  agent,
  modelOptions,
  onOpen,
  onRenameAgent,
  onModelChange,
  canChangeModel,
  menuContext,
  isSelected,
  assignedCampaignIds,
  hasBrain,
}: {
  agent: MissionAgent
  modelOptions: LlmModelOption[]
  onOpen: (agentKey: string) => void
  onRenameAgent: (agentKey: string, name: string) => void | Promise<void>
  onModelChange: (
    agentKey: string,
    modelId: string,
    modelSettings: ChatModelSettings | null,
  ) => void | Promise<void>
  canChangeModel: (agent: MissionAgent) => boolean
  menuContext: AgentMenuContext
  isSelected: boolean
  assignedCampaignIds?: string[]
  hasBrain: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState(agent.name)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const label = statusLabel(agent)
  const dateLabel = new Date(agent.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const canFire = menuContext.canFireAgent && canFireAgent(agent)
  const { menuActions } = menuContext

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

  const openMenuFromButton = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    openMenuAt(rect.right - 224, rect.bottom + 4)
  }

  const commitRename = () => {
    const trimmed = renameDraft.trim()
    if (!trimmed || trimmed === agent.name) {
      setRenaming(false)
      return
    }
    void Promise.resolve(onRenameAgent(agent.agent_key, trimmed)).then(() => {
      setRenaming(false)
    })
  }

  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return Boolean(
      target.closest('[data-agent-model-dropdown], [data-agent-list-actions], button, input'),
    )
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (isInteractiveTarget(event.target)) return
    event.preventDefault()
    onOpen(agent.agent_key)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if (renaming) return
        if (isInteractiveTarget(event.target)) return
        onOpen(agent.agent_key)
      }}
      onContextMenu={(event) => {
        if (renaming) return
        event.preventDefault()
        event.stopPropagation()
        openMenuAt(event.clientX, event.clientY)
      }}
      onKeyDown={handleKeyDown}
      className={`group/agent-list-row gap-spacing-3 border-border body-4 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 grid w-full ${LIST_GRID_COLS} items-center border-b text-left transition-colors last:border-b-0`}
    >
      <div
        className="flex min-w-0 items-center gap-2"
        onClick={(event) => {
          if (renaming) event.stopPropagation()
        }}
      >
        {agent.image_url ? (
          <img
            src={agent.image_url}
            alt=""
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="bg-muted typo-caption text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold">
            {agent.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        {renaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onBlur={() => void commitRename()}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Escape') {
                setRenameDraft(agent.name)
                setRenaming(false)
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                renameInputRef.current?.blur()
              }
            }}
            className="body-4 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent font-medium outline-none"
            aria-label="Agent name"
          />
        ) : (
          <span className="body-4 truncate font-medium" title={agent.name}>{agent.name}</span>
        )}
      </div>
      <div className="body-4 text-muted-foreground min-w-0 truncate">
        {agent.role || agent.level || '—'}
      </div>
      <div className="flex items-center gap-1.5">
        <span className={agentPresenceStatusDotClass(agent)} aria-hidden />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="flex min-w-0 items-center">
        <AgentListModelPicker
          agent={agent}
          modelOptions={modelOptions}
          disabled={!canChangeModel(agent)}
          onModelChange={onModelChange}
        />
      </div>
      <div className="text-muted-foreground">{dateLabel}</div>
      <div
        data-agent-list-actions
        className="flex items-center justify-end"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          title="More"
          aria-label="Agent actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={`text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-opacity group-hover/agent-list-row:opacity-100 ${
            menuOpen ? 'bg-hover-subtle text-foreground opacity-100' : ''
          }`}
          onClick={openMenuFromButton}
        >
          <MoreHorizontal className="icon-sm" />
        </button>
      </div>

      <AgentActionsMenu
        open={menuOpen}
        anchor={menuAnchor}
        agent={agent}
        isSystemLikeAgent={menuContext.isSystemLikeAgent}
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
        isFavorite={menuContext.isFavorite}
        onToggleFavorite={menuContext.onToggleFavorite}
        canFavorite={menuContext.canFavorite}
        teams={menuContext.teams as AgentTeamOption[]}
        onSelectTeam={(teamId) => menuContext.onSelectTeam(agent.agent_key, teamId)}
        onDeactivate={menuActions.onDeactivate}
        onFire={menuActions.onFire}
        showAccess={menuContext.showAccess}
        hasBrain={hasBrain}
        canRename={menuContext.canRename}
        canDeactivate={menuContext.canDeactivate}
        canMoveTeam={menuContext.canMoveTeam}
        canFire={canFire}
        canManageCampaigns={menuContext.canManageCampaigns}
        nonGeneralCampaigns={menuContext.nonGeneralCampaigns}
        assignedCampaignIds={isSelected ? assignedCampaignIds : undefined}
        onAssignmentsChanged={menuActions.onAssignmentsChanged}
        fireLabel={menuContext.fireLabel}
      />
    </div>
  )
}

export function AgentsListView({
  agents,
  groups = null,
  collapsedGroupKeys,
  onToggleGroup,
  modelOptions,
  onOpen,
  onRenameAgent,
  onModelChange,
  canChangeModel,
  getAgentMenuContext,
  selectedAgentKey,
  assignedCampaignIdsForSelected,
  hasBrainForSelected,
}: AgentsListViewProps) {
  const renderRow = (agent: MissionAgent) => {
    const isSelected = selectedAgentKey !== null && agent.agent_key === selectedAgentKey
    const menuContext = getAgentMenuContext(agent)
    return (
      <AgentListRow
        key={agent.id}
        agent={agent}
        modelOptions={modelOptions}
        onOpen={onOpen}
        onRenameAgent={onRenameAgent}
        onModelChange={onModelChange}
        canChangeModel={canChangeModel}
        menuContext={menuContext}
        isSelected={isSelected}
        assignedCampaignIds={assignedCampaignIdsForSelected}
        hasBrain={isSelected ? hasBrainForSelected : menuContext.hasBrain}
      />
    )
  }

  const rows =
    groups && groups.length > 0
      ? groups.map((group) => {
          const expanded = collapsedGroupKeys ? !collapsedGroupKeys.has(group.key) : true
          return (
            <div key={group.key}>
              <AgentsGroupSectionHeader
                group={group}
                expanded={expanded}
                onToggle={() => onToggleGroup?.(group.key)}
                sticky
              />
              {expanded ? group.items.map(renderRow) : null}
            </div>
          )
        })
      : agents.map(renderRow)

  return (
    <div className="surface-card border-subtle rounded-spacing-3 flex min-h-0 flex-1 flex-col overflow-hidden border">
      <div
        className={`gap-spacing-3 border-border body-4 text-muted-foreground px-spacing-3 py-spacing-2 grid shrink-0 ${LIST_GRID_COLS} border-b font-medium uppercase tracking-wide`}
      >
        <div>Name</div>
        <div>Role</div>
        <div>Status</div>
        <div>Model</div>
        <div>Created</div>
        <div aria-hidden />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {agents.length === 0 ? (
          <div className="body-3 text-muted-foreground p-spacing-4 text-center">
            No agents match the current filters.
          </div>
        ) : (
          rows
        )}
      </div>
    </div>
  )
}
