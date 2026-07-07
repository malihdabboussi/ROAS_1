'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AgentAvatar } from '@/components/agents'
import type { MissionAgentSidebar } from '@/lib/agents'

const STACK_MAX = 4
const PEEK_GAP = 6
const HOVER_CLOSE_DELAY_MS = 140

export function TeamAgentAvatarStack({
  agents,
  emptyLabel = '—',
  avatarClassName = 'h-5 w-5',
}: {
  agents: MissionAgentSidebar[]
  emptyLabel?: string
  avatarClassName?: string
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [peekOpen, setPeekOpen] = useState(false)
  const [peekPos, setPeekPos] = useState<{
    top: number
    left: number
    placement: 'above' | 'below'
  } | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setPeekOpen(false), HOVER_CLOSE_DELAY_MS)
  }, [cancelClose])

  const repositionPanel = useCallback(() => {
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

  useLayoutEffect(() => {
    if (!peekOpen) return
    repositionPanel()
  }, [peekOpen, agents.length, repositionPanel])

  useEffect(() => {
    if (!peekOpen) return
    const onScrollOrResize = () => repositionPanel()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [peekOpen, repositionPanel])

  useEffect(() => () => cancelClose(), [cancelClose])

  if (agents.length === 0) {
    return <span className="body-4 text-muted-foreground">{emptyLabel}</span>
  }

  const visible = agents.slice(0, STACK_MAX)
  const overflow = agents.length - visible.length

  return (
    <>
      <div
        ref={anchorRef}
        className="flex cursor-default items-center"
        onMouseEnter={() => {
          cancelClose()
          setPeekOpen(true)
        }}
        onMouseLeave={scheduleClose}
        role="img"
        aria-label={`${agents.length} agent${agents.length === 1 ? '' : 's'} on this team`}
      >
        {visible.map((agent, index) => (
          <span key={agent.agent_key} className={index > 0 ? '-ml-spacing-2' : ''}>
            <AgentAvatar agent={agent} className={avatarClassName} />
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
              className="dropdown-menu-solid z-dropdown pointer-events-auto fixed min-w-[11rem] max-w-[14rem] rounded-xl py-1 shadow-lg"
              style={{
                top: peekPos.top,
                left: peekPos.left,
                transform: peekPos.placement === 'above' ? 'translateY(-100%)' : undefined,
              }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-1 uppercase tracking-wide">
                Agents
              </p>
              {agents.map((agent) => (
                <div
                  key={agent.agent_key}
                  className="gap-spacing-2 px-spacing-3 py-spacing-1.5 flex min-w-0 items-center"
                >
                  <AgentAvatar agent={agent} className="h-4 w-4 shrink-0" />
                  <span className="body-3 min-w-0 truncate">{agent.name}</span>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
