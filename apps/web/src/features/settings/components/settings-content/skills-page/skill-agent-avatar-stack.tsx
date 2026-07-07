'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { MissionAgent, MissionAgentSkill } from '@/features/mission-control/types'
import { isSkillWriteLockedAgent } from '@/lib/agents/system-agent-contracts'
import { SkillAgentAvatar } from './skill-menu/skill-agent-avatar'
import { copySkillToAgent } from './skill-menu/skill-copy.util'
import { isOfficialSkill } from './skills-page.utils'

const STACK_MAX = 4
const PEEK_GAP = 6
const HOVER_CLOSE_DELAY_MS = 140
const ADD_SUBMENU_WIDTH = 240

function agentRoleLabel(agent: MissionAgent): string {
  return agent.role?.trim() || agent.specialty?.trim() || agent.level?.trim() || 'Agent'
}

export function SkillAgentAvatarStack({
  skill,
  agentsWithSkill,
  allAgents,
  onSkillsChanged,
}: {
  skill: MissionAgentSkill
  agentsWithSkill: MissionAgent[]
  allAgents: MissionAgent[]
  onSkillsChanged: () => void
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const addSubmenuRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [peekOpen, setPeekOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [addingAgentKey, setAddingAgentKey] = useState<string | null>(null)
  const [peekPos, setPeekPos] = useState<{
    top: number
    left: number
    placement: 'above' | 'below'
  } | null>(null)
  const [addSubPos, setAddSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const assignedKeys = useMemo(
    () => new Set(agentsWithSkill.map((agent) => agent.agent_key)),
    [agentsWithSkill],
  )

  const addableAgents = useMemo(
    () =>
      allAgents.filter(
        (agent) => !assignedKeys.has(agent.agent_key) && !isSkillWriteLockedAgent(agent.agent_key),
      ),
    [allAgents, assignedKeys],
  )

  const canAddToAgent = !isOfficialSkill(skill) && addableAgents.length > 0

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const scheduleCloseAll = useCallback(() => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => {
      setPeekOpen(false)
      setAddMenuOpen(false)
    }, HOVER_CLOSE_DELAY_MS)
  }, [cancelClose])

  const repositionMainPanel = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const panelH = panel?.offsetHeight ?? 120
    const panelW = panel?.offsetWidth ?? 160
    const margin = 8
    const fitsAbove = rect.top - PEEK_GAP - panelH >= margin
    const placement = fitsAbove ? 'above' : 'below'
    const top = placement === 'above' ? rect.top - PEEK_GAP : rect.bottom + PEEK_GAP
    let left = rect.left + rect.width / 2 - panelW / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - panelW - margin))
    setPeekPos({ top, left, placement })
  }, [])

  const repositionAddSubmenu = useCallback(() => {
    const btn = addButtonRef.current
    if (!btn || !addMenuOpen) return
    const rect = btn.getBoundingClientRect()
    const submenu = addSubmenuRef.current
    const submenuH = submenu?.offsetHeight ?? 240
    const margin = 8
    let left = rect.right + 4
    if (left + ADD_SUBMENU_WIDTH > window.innerWidth - margin) {
      left = rect.left - ADD_SUBMENU_WIDTH - 4
    }
    let top = rect.top
    if (top + submenuH > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - submenuH - margin)
    }
    setAddSubPos({ top, left })
  }, [addMenuOpen])

  const openPeek = useCallback(() => {
    cancelClose()
    setPeekOpen(true)
  }, [cancelClose])

  const handleAddToAgent = useCallback(
    async (targetAgentKey: string) => {
      setAddingAgentKey(targetAgentKey)
      try {
        await copySkillToAgent(skill, targetAgentKey)
        toast.success('Skill added to agent')
        onSkillsChanged()
        setAddMenuOpen(false)
      } catch {
        toast.error('Failed to add skill to agent')
      } finally {
        setAddingAgentKey(null)
      }
    },
    [skill, onSkillsChanged],
  )

  useLayoutEffect(() => {
    if (!peekOpen) return
    repositionMainPanel()
  }, [peekOpen, agentsWithSkill.length, repositionMainPanel])

  useLayoutEffect(() => {
    if (!addMenuOpen) return
    repositionAddSubmenu()
  }, [addMenuOpen, addableAgents.length, repositionAddSubmenu])

  useEffect(() => {
    if (!peekOpen) return
    const onScrollOrResize = () => {
      repositionMainPanel()
      repositionAddSubmenu()
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [peekOpen, addMenuOpen, repositionMainPanel, repositionAddSubmenu])

  useEffect(() => {
    if (!peekOpen) setAddMenuOpen(false)
  }, [peekOpen])

  useEffect(() => () => cancelClose(), [cancelClose])

  if (agentsWithSkill.length === 0) return null

  const visible = agentsWithSkill.slice(0, STACK_MAX)
  const overflow = agentsWithSkill.length - visible.length

  const rowBtnCls =
    'gap-spacing-2 px-spacing-3 py-spacing-1.5 body-3 flex w-full min-w-0 items-center text-left transition-colors hover:bg-[var(--color-hover-subtle)] disabled:cursor-not-allowed disabled:opacity-50'

  const addAgentRowCls =
    'gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full min-w-0 items-start text-left transition-colors hover:bg-[var(--color-hover-subtle)] disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <>
      <div
        ref={anchorRef}
        className="flex cursor-default items-center justify-center"
        onMouseEnter={openPeek}
        onMouseLeave={scheduleCloseAll}
        role="img"
        aria-label={`${agentsWithSkill.length} agent${agentsWithSkill.length === 1 ? '' : 's'} with this skill`}
      >
        {visible.map((agent, index) => (
          <span key={agent.agent_key} className={index > 0 ? '-ml-spacing-2' : ''}>
            <SkillAgentAvatar agent={agent} className="h-5 w-5" />
          </span>
        ))}
        {overflow > 0 ? (
          <span className="bg-muted text-muted-foreground -ml-spacing-2 body-4 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-medium">
            +{overflow}
          </span>
        ) : null}
      </div>

      {peekOpen && peekPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              data-skill-agent-stack-panel
              className="dropdown-menu-solid z-dropdown pointer-events-auto fixed min-w-[11rem] max-w-[14rem] rounded-xl py-1 shadow-lg"
              style={{
                top: peekPos.top,
                left: peekPos.left,
                transform: peekPos.placement === 'above' ? 'translateY(-100%)' : undefined,
              }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleCloseAll}
            >
              <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-1 uppercase tracking-wide">
                Agents
              </p>
              {agentsWithSkill.map((agent) => (
                <div
                  key={agent.agent_key}
                  className="gap-spacing-2 px-spacing-3 py-spacing-1.5 flex min-w-0 items-center"
                >
                  <SkillAgentAvatar agent={agent} className="h-4 w-4 shrink-0" />
                  <span className="body-3 min-w-0 truncate">{agent.name}</span>
                </div>
              ))}

              {canAddToAgent ? (
                <>
                  <div className="border-border my-spacing-1 border-t" />
                  <button
                    ref={addButtonRef}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => {
                      cancelClose()
                      setAddMenuOpen(true)
                    }}
                    onClick={() => setAddMenuOpen(true)}
                    className={rowBtnCls}
                    aria-expanded={addMenuOpen}
                    aria-haspopup="menu"
                  >
                    <Plus className="icon-sm shrink-0 opacity-70" />
                    <span className="min-w-0 flex-1 truncate">Add to agent</span>
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {peekOpen && addMenuOpen && canAddToAgent && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={addSubmenuRef}
              data-skill-agent-stack-panel
              className="dropdown-menu-solid z-dropdown pointer-events-auto fixed max-h-[min(16rem,calc(100vh-16px))] overflow-y-auto rounded-xl py-1 shadow-lg"
              style={{
                top: addSubPos.top,
                left: addSubPos.left,
                width: ADD_SUBMENU_WIDTH,
              }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleCloseAll}
            >
              {addableAgents.map((agent) => {
                const busy = addingAgentKey === agent.agent_key
                return (
                  <button
                    key={agent.agent_key}
                    type="button"
                    disabled={!!addingAgentKey}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void handleAddToAgent(agent.agent_key)}
                    className={addAgentRowCls}
                  >
                    <SkillAgentAvatar agent={agent} className="h-9 w-9 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="body-3 block truncate font-medium">{agent.name}</span>
                      <span className="body-4 text-muted-foreground block truncate">
                        {agentRoleLabel(agent)}
                      </span>
                    </span>
                    {busy ? (
                      <Loader2 className="icon-xs mt-spacing-1 shrink-0 animate-spin opacity-70" />
                    ) : null}
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
