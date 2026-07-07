'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Brain,
  Check,
  ChevronRight,
  Flame,
  FolderKanban,
  MessageCircle,
  PencilLine,
  Pin,
  PinOff,
  PowerOff,
  Radio,
  Settings2,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react'
import type { MissionAgent } from '@/features/mission-control/types'
import {
  assignAgentToCampaign,
  fetchAgentCampaignAssignments,
  unassignAgentFromCampaign,
} from '@/features/studio/services/campaign.service'
import type { Campaign } from '@/features/studio/types'
import { CAMPAIGN_CORE_AGENT_KEYS } from '../constants/team.constants'
import { agentShowsCampaignAssignment } from '../lib/agent-info-panel-tabs'

const HOVER_CLOSE_DELAY_MS = 140
const SUBMENU_WIDTH = 240
const MENU_MIN_WIDTH = 224

type SubmenuKind = 'campaign' | 'team' | null

export type AgentTeamOption = { id: string; name: string }

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive
          ? 'text-red-400 hover:bg-[var(--color-hover-subtle)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-[var(--color-hover-subtle)]'
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}

export interface AgentActionsMenuProps {
  open: boolean
  anchor: { top: number; left: number } | null
  agent: MissionAgent
  isSystemLikeAgent: boolean
  onClose: () => void
  onCopyId: () => void
  onOpenInNewTab: () => void
  onOpenChat: () => void
  onOpenEdit: () => void
  onOpenSkills: () => void
  onOpenComms: () => void
  onOpenAccess?: () => void
  onOpenBrain: () => void
  onSetupBrain?: () => void
  onRename: () => void
  isFavorite?: boolean
  onToggleFavorite?: () => void | Promise<void>
  canFavorite?: boolean
  onDeactivate?: () => void
  onFire?: () => void
  showAccess: boolean
  hasBrain: boolean
  canRename: boolean
  canDeactivate: boolean
  canMoveTeam: boolean
  canFire: boolean
  canManageCampaigns: boolean
  nonGeneralCampaigns: Campaign[]
  teams: AgentTeamOption[]
  onSelectTeam?: (teamId: string | null) => void | Promise<void>
  onTeamChanged?: () => void | Promise<void>
  assignedCampaignIds?: string[]
  onAssignmentsChanged?: () => void | Promise<void>
  fireLabel?: string
}

export function AgentActionsMenu(props: AgentActionsMenuProps) {
  const {
    open,
    anchor,
    agent,
    isSystemLikeAgent,
    onClose,
    onCopyId,
    onOpenInNewTab,
    onOpenChat,
    onOpenEdit,
    onOpenSkills,
    onOpenComms,
    onOpenAccess,
    onOpenBrain,
    onSetupBrain,
    onRename,
    isFavorite = false,
    onToggleFavorite,
    canFavorite = false,
    onDeactivate,
    onFire,
    showAccess,
    hasBrain,
    canRename,
    canDeactivate,
    canMoveTeam,
    canFire,
    canManageCampaigns,
    nonGeneralCampaigns,
    teams,
    onSelectTeam,
    onTeamChanged,
    assignedCampaignIds,
    onAssignmentsChanged,
    fireLabel = 'Fire employee',
  } = props

  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const campaignRowRef = useRef<HTMLButtonElement>(null)
  const teamRowRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [openSubmenu, setOpenSubmenu] = useState<SubmenuKind>(null)
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set())
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [campaignBusy, setCampaignBusy] = useState(false)
  const [teamBusy, setTeamBusy] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [subPos, setSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const currentTeamId = agent.team_id ?? null

  const showCampaigns = canManageCampaigns && agentShowsCampaignAssignment(agent, isSystemLikeAgent)

  const sortedCampaigns = useMemo(
    () => [...nonGeneralCampaigns].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [nonGeneralCampaigns],
  )

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  )

  const itemIcon = 'h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]'
  const quickCellCls =
    'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'
  const submenuRowCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50'

  const submenuTriggerCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50'

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setOpenSubmenu(null), HOVER_CLOSE_DELAY_MS)
  }

  const openSubmenuKind = (kind: SubmenuKind) => {
    cancelClose()
    setOpenSubmenu(kind)
  }

  useEffect(() => () => cancelClose(), [])

  useEffect(() => {
    if (!open) {
      setOpenSubmenu(null)
      return
    }
    if (assignedCampaignIds) {
      setAssignedIds(new Set(assignedCampaignIds))
      return
    }
    let cancelled = false
    setAssignmentsLoading(true)
    fetchAgentCampaignAssignments(agent.agent_key)
      .then((ids) => {
        if (!cancelled) setAssignedIds(new Set(ids))
      })
      .catch(() => {
        if (!cancelled) setAssignedIds(new Set())
      })
      .finally(() => {
        if (!cancelled) setAssignmentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, agent.agent_key, assignedCampaignIds])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (menuRef.current?.contains(t)) return
      if (submenuRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPosition(null)
      return
    }
    const el = menuRef.current
    const width = el?.offsetWidth ?? MENU_MIN_WIDTH
    const height = el?.offsetHeight ?? 360
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = anchor.left
    let top = anchor.top
    if (left + width + margin > vw) left = Math.max(margin, vw - width - margin)
    if (top + height + margin > vh) top = Math.max(margin, anchor.top - height)
    if (top < margin) top = margin
    setPosition({ top, left })
  }, [open, anchor, openSubmenu, sortedCampaigns.length, sortedTeams.length])

  useLayoutEffect(() => {
    const anchorEl =
      openSubmenu === 'campaign'
        ? campaignRowRef.current
        : openSubmenu === 'team'
          ? teamRowRef.current
          : null
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let left = rect.right + 4
    let top = rect.top
    if (left + SUBMENU_WIDTH + pad > vw) left = Math.max(pad, rect.left - SUBMENU_WIDTH - 4)
    if (top + 200 > vh) top = Math.max(pad, vh - 200 - pad)
    setSubPos({ top, left })
  }, [openSubmenu])

  const toggleCampaign = async (campaignId: string) => {
    if (campaignBusy) return
    const assigned = assignedIds.has(campaignId)
    if (assigned && CAMPAIGN_CORE_AGENT_KEYS.has(agent.agent_key)) return
    setCampaignBusy(true)
    try {
      if (assigned) {
        await unassignAgentFromCampaign(campaignId, agent.agent_key)
        setAssignedIds((prev) => {
          const next = new Set(prev)
          next.delete(campaignId)
          return next
        })
      } else {
        await assignAgentToCampaign(campaignId, agent.agent_key)
        setAssignedIds((prev) => new Set(prev).add(campaignId))
        await onAssignmentsChanged?.()
        close()
        return
      }
      await onAssignmentsChanged?.()
    } finally {
      setCampaignBusy(false)
    }
  }

  const close = () => onClose()

  const selectTeam = async (teamId: string | null) => {
    if (teamBusy || !onSelectTeam) return
    if (teamId === currentTeamId || (teamId === null && currentTeamId === null)) return
    setTeamBusy(true)
    try {
      await onSelectTeam(teamId)
      await onTeamChanged?.()
      close()
    } finally {
      setTeamBusy(false)
    }
  }

  const submenuOpen = openSubmenu !== null

  if (!open || !anchor || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        ref={menuRef}
        data-agent-actions-menu
        role="menu"
        className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 overflow-visible border shadow-lg"
        style={{
          top: position?.top ?? anchor.top,
          left: position?.left ?? anchor.left,
          visibility: position ? 'visible' : 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
          <div className="divide-border flex w-full divide-x">
            <button
              type="button"
              className={quickCellCls}
              onClick={() => {
                onCopyId()
                close()
              }}
            >
              Copy ID
            </button>
            <button
              type="button"
              className={quickCellCls}
              onClick={() => {
                onOpenInNewTab()
                close()
              }}
            >
              New tab
            </button>
          </div>
        </div>

        <div className="gap-spacing-1 px-spacing-1 flex flex-col">
          <MenuItem
            icon={<MessageCircle className={itemIcon} />}
            label="Open chat"
            onClick={() => {
              onOpenChat()
              close()
            }}
          />

          <div className="border-border border-t" />

          <MenuItem
            icon={<Settings2 className={itemIcon} />}
            label="Edit"
            onClick={() => {
              onOpenEdit()
              close()
            }}
          />
          <MenuItem
            icon={<Wrench className={itemIcon} />}
            label="Skills"
            onClick={() => {
              onOpenSkills()
              close()
            }}
          />
          <MenuItem
            icon={<Radio className={itemIcon} />}
            label="Comms"
            onClick={() => {
              onOpenComms()
              close()
            }}
          />
          {showAccess && onOpenAccess ? (
            <MenuItem
              icon={<Shield className={itemIcon} />}
              label="Access"
              onClick={() => {
                onOpenAccess()
                close()
              }}
            />
          ) : null}
          {hasBrain ? (
            <MenuItem
              icon={<Brain className={itemIcon} />}
              label="Agent brain"
              onClick={() => {
                onOpenBrain()
                close()
              }}
            />
          ) : onSetupBrain ? (
            <MenuItem
              icon={<Sparkles className={itemIcon} />}
              label="Set up brain"
              onClick={() => {
                onSetupBrain()
                close()
              }}
            />
          ) : null}

          {showCampaigns || (canMoveTeam && onSelectTeam) ? (
            <div className="border-border border-t" />
          ) : null}

          {showCampaigns ? (
            <button
              ref={campaignRowRef}
              type="button"
              role="menuitem"
              disabled={assignmentsLoading || sortedCampaigns.length === 0 || campaignBusy}
              onMouseEnter={() => openSubmenuKind('campaign')}
              onMouseLeave={scheduleClose}
              onFocus={() => openSubmenuKind('campaign')}
              onClick={() => setOpenSubmenu((s) => (s === 'campaign' ? null : 'campaign'))}
              className={submenuTriggerCls}
              aria-haspopup="menu"
              aria-expanded={openSubmenu === 'campaign'}
            >
              <FolderKanban className={itemIcon} />
              <span className="min-w-0 flex-1 truncate">Assign to campaign</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
            </button>
          ) : null}

          {canMoveTeam && onSelectTeam ? (
            <button
              ref={teamRowRef}
              type="button"
              role="menuitem"
              disabled={teamBusy}
              onMouseEnter={() => openSubmenuKind('team')}
              onMouseLeave={scheduleClose}
              onFocus={() => openSubmenuKind('team')}
              onClick={() => setOpenSubmenu((s) => (s === 'team' ? null : 'team'))}
              className={submenuTriggerCls}
              aria-haspopup="menu"
              aria-expanded={openSubmenu === 'team'}
            >
              <Users className={itemIcon} />
              <span className="min-w-0 flex-1 truncate">Move to team</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
            </button>
          ) : null}

          {canFavorite && onToggleFavorite ? (
            <MenuItem
              icon={isFavorite ? <PinOff className={itemIcon} /> : <Pin className={itemIcon} />}
              label={isFavorite ? 'Remove favorite' : 'Favorite'}
              onClick={() => {
                void onToggleFavorite()
                close()
              }}
            />
          ) : null}

          {canRename || canDeactivate ? <div className="border-border border-t" /> : null}
          {canRename ? (
            <MenuItem
              icon={<PencilLine className={itemIcon} />}
              label="Rename"
              onClick={() => {
                onRename()
                close()
              }}
            />
          ) : null}
          {canDeactivate && onDeactivate ? (
            <MenuItem
              icon={<PowerOff className={itemIcon} />}
              label="Deactivate"
              disabled={agent.is_active === false}
              onClick={() => {
                if (agent.is_active === false) return
                onDeactivate()
                close()
              }}
            />
          ) : null}

          {canFire && onFire ? (
            <>
              <div className="border-border border-t" />
              <MenuItem
                icon={<Flame className={itemIcon} />}
                label={fireLabel}
                destructive
                onClick={() => {
                  onFire()
                  close()
                }}
              />
            </>
          ) : null}
        </div>
      </div>

      {submenuOpen ? (
        <div
          ref={submenuRef}
          role="menu"
          className="z-dropdown dropdown-menu-solid fixed max-h-[min(280px,50vh)] overflow-y-auto rounded-xl py-1 shadow-lg"
          style={{
            top: subPos.top,
            left: subPos.left,
            width: SUBMENU_WIDTH,
            scrollbarWidth: 'none',
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onClick={(e) => e.stopPropagation()}
        >
          {openSubmenu === 'campaign' ? (
            assignmentsLoading ? (
              <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-2">Loading…</p>
            ) : sortedCampaigns.length === 0 ? (
              <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-2">No campaigns</p>
            ) : (
              sortedCampaigns.map((campaign) => {
                const checked = assignedIds.has(campaign.id)
                const locked = checked && CAMPAIGN_CORE_AGENT_KEYS.has(agent.agent_key)
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    disabled={campaignBusy || locked}
                    onClick={() => void toggleCampaign(campaign.id)}
                    className={submenuRowCls}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        checked
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--primary-foreground)]'
                          : 'border-[var(--color-border)]'
                      }`}
                    >
                      {checked ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{campaign.name}</span>
                  </button>
                )
              })
            )
          ) : null}

          {openSubmenu === 'team' ? (
            <>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={currentTeamId === null}
                disabled={teamBusy}
                onClick={() => void selectTeam(null)}
                className={submenuRowCls}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    currentTeamId === null
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  {currentTeamId === null ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-foreground)]" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate">No team</span>
              </button>
              {sortedTeams.map((team) => {
                const selected = currentTeamId === team.id
                return (
                  <button
                    key={team.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    disabled={teamBusy}
                    onClick={() => void selectTeam(team.id)}
                    className={submenuRowCls}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                          : 'border-[var(--color-border)]'
                      }`}
                    >
                      {selected ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-foreground)]" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  </button>
                )
              })}
            </>
          ) : null}
        </div>
      ) : null}
    </>,
    document.body,
  )
}
