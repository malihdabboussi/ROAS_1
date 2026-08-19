'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Pin, UserX } from 'lucide-react'
import { VibeyLoadingSphereSimple } from '@/components/vibey/vibey-loading-sphere-simple'
import type { MissionAgent } from '@/features/mission-control/types'
import { RoleEmblem } from '../components/RoleEmblem'
import { SYSTEM_LIKE_AGENT_KEYS } from '../constants/team.constants'

export interface CarouselScrollDelta {
  left?: number
  top?: number
}

interface CarouselSlideProps {
  agent: MissionAgent
  variant: 'horizontal' | 'vertical'
  isSelected: boolean
  dragAgentId: string | null
  dragOverAgentId: string | null
  roleLabelRefs: React.MutableRefObject<Record<string, HTMLSpanElement | null>>
  setSelectedId: (id: string) => void
  setDragAgentId: (id: string | null) => void
  setDragOverAgentId: (id: string | null) => void
  setAgents: React.Dispatch<React.SetStateAction<MissionAgent[]>>
  reorderAgents: (agentKeys: string[]) => Promise<unknown>
  onPinAgent: (agentId: string) => void
  onRenameAgent: (agentId: string, newName: string) => void
  onFireAgent?: (agentId: string) => void
  pinnedAgentIds: Set<string>
  /** Vertical slides: kebab with Change name / Pin to top. Default true. */
  showAgentSlideMenu?: boolean
}

export function CarouselSlide({
  agent,
  variant,
  isSelected,
  dragAgentId,
  dragOverAgentId,
  roleLabelRefs,
  setSelectedId,
  setDragAgentId,
  setDragOverAgentId,
  setAgents,
  reorderAgents,
  onPinAgent,
  onRenameAgent,
  onFireAgent,
  pinnedAgentIds,
  showAgentSlideMenu = true,
}: CarouselSlideProps) {
  const isHr = agent.agent_key === 'hr'
  const roleText = isHr ? 'Recruiter' : agent.role
  const isDragOver = dragOverAgentId === agent.id && dragAgentId !== agent.id
  const agentConfig = (agent.config ?? {}) as Record<string, unknown>
  const agentAvatarMode = agentConfig.avatar_mode === 'portrait' ? 'portrait' : 'animation'
  const showAgentVibeyAnimation =
    agent.agent_key === 'vibey' && agentAvatarMode === 'animation' && !agent.image_url
  const isVert = variant === 'vertical'
  const isVibey = agent.agent_key === 'vibey'

  const slideWidth = isVert ? 'w-full max-w-full shrink-0' : 'w-spacing-36 shrink-0'
  const avatarSize = isVert ? 'h-10 w-10 shrink-0' : 'h-14 w-14'

  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [editingName, setEditingName] = useState(false)
  const [nameInputValue, setNameInputValue] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        menuRef.current &&
        !menuRef.current.contains(t) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(t)
      )
        setMenuOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const handleScroll = () => setMenuOpen(false)
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [menuOpen])

  const layoutClass = isVert
    ? 'gap-spacing-2 px-spacing-2 flex-row items-center'
    : 'gap-spacing-1 flex-col items-center'

  const dragInnerClass = isVert
    ? 'gap-spacing-2 flex-1 flex min-w-0 flex-row items-center'
    : 'gap-spacing-1 flex min-w-0 w-full flex-col items-center'

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', agent.id)
        setDragAgentId(agent.id)
        const inner = e.currentTarget.querySelector('[data-drag-content]') as HTMLElement | null
        if (inner) {
          const clone = inner.cloneNode(true) as HTMLElement
          clone.style.cssText =
            'position:fixed;left:-9999px;top:-9999px;border-radius:12px;overflow:hidden;background:rgba(32,32,32,0.95);padding:8px;pointer-events:none;z-index:-1;'
          document.body.appendChild(clone)
          e.dataTransfer.setDragImage(clone, clone.offsetWidth / 2, clone.offsetHeight / 2)
          setTimeout(() => clone.remove(), 100)
        }
      }}
      onDragEnd={() => {
        setDragAgentId(null)
        setDragOverAgentId(null)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverAgentId(agent.id)
      }}
      onDragLeave={() => {
        if (dragOverAgentId === agent.id) setDragOverAgentId(null)
      }}
      onDrop={(e) => {
        e.preventDefault()
        const fromId = e.dataTransfer.getData('text/plain') || dragAgentId
        if (!fromId || fromId === agent.id) return
        setAgents((prev) => {
          const fromIdx = prev.findIndex((a) => a.id === fromId)
          const toIdx = prev.findIndex((a) => a.id === agent.id)
          if (fromIdx === -1 || toIdx === -1) return prev
          const next = [...prev]
          const [moved] = next.splice(fromIdx, 1)
          if (!moved) return prev
          next.splice(toIdx, 0, moved)
          void reorderAgents(next.map((a) => a.agent_key))
          return next
        })
        setDragAgentId(null)
        setDragOverAgentId(null)
      }}
      className={`group/agent rounded-spacing-2 py-spacing-2 relative flex cursor-grab transition-opacity ${layoutClass} ${slideWidth} ${
        isSelected ? 'chip-glass-blue' : 'hover:bg-white/5'
      } ${dragAgentId === agent.id ? 'opacity-40' : ''} ${isDragOver ? 'ring-primary/40 ring-1' : ''}`}
      style={{ transform: 'none', outline: 'none' }}
      onClick={() => setSelectedId(agent.id)}
      role="button"
      tabIndex={0}
    >
      <div data-drag-content className={dragInnerClass}>
        {agent.image_url ? (
          <div className={`${avatarSize} shrink-0 overflow-hidden rounded-full bg-white/5`}>
            <img
              src={agent.image_url}
              alt={agent.name}
              className="pointer-events-none h-full w-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <>
            {showAgentVibeyAnimation ? (
              <div className={`${avatarSize} shrink-0 overflow-hidden rounded-full bg-white/5`}>
                <VibeyLoadingSphereSimple size="small" state="idle" showBackground={false} />
              </div>
            ) : (
              <RoleEmblem roleKey={agent.agent_key} size="sm" />
            )}
          </>
        )}
        {isVert ? (
          <div className="flex min-w-0 flex-1 flex-col">
            {editingName ? (
              <input
                ref={nameInputRef}
                className="body-3 text-foreground border-primary w-full border-b bg-transparent font-medium leading-tight outline-none"
                value={nameInputValue}
                onChange={(e) => setNameInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = nameInputValue.trim()
                    if (trimmed && trimmed !== agent.name) onRenameAgent(agent.id, trimmed)
                    setEditingName(false)
                  }
                  if (e.key === 'Escape') setEditingName(false)
                }}
                onBlur={() => {
                  const trimmed = nameInputValue.trim()
                  if (trimmed && trimmed !== agent.name) onRenameAgent(agent.id, trimmed)
                  setEditingName(false)
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="body-3 text-foreground gap-spacing-1 flex flex-wrap items-center font-medium leading-tight">
                <span className="whitespace-normal break-words">{agent.name}</span>
                {pinnedAgentIds.has(agent.id) && (
                  <Pin className="icon-xs text-muted-foreground/60 shrink-0" />
                )}
              </span>
            )}
            <span
              ref={(el) => {
                roleLabelRefs.current[agent.id] = el
              }}
              className="body-4 text-muted-foreground/60 whitespace-normal break-words leading-tight"
            >
              {roleText}
            </span>
          </div>
        ) : (
          <>
            <span className="body-3 text-foreground max-w-full whitespace-normal break-words text-center font-medium leading-tight">
              {agent.name}
            </span>
            <span
              ref={(el) => {
                roleLabelRefs.current[agent.id] = el
              }}
              className="body-4 text-muted-foreground/60 max-w-full whitespace-normal break-words text-center leading-tight"
            >
              {roleText}
            </span>
          </>
        )}
      </div>
      {isVert && showAgentSlideMenu && (
        <>
          <button
            ref={menuBtnRef}
            type="button"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              if (menuBtnRef.current) {
                const rect = menuBtnRef.current.getBoundingClientRect()
                setMenuPos({ top: rect.top, right: window.innerWidth - rect.left + 4 })
              }
              setMenuOpen((v) => !v)
            }}
            className={`rounded-spacing-1 p-spacing-1 shrink-0 transition-opacity hover:bg-white/10 ${
              menuOpen ? 'opacity-100' : 'opacity-0 group-hover/agent:opacity-100'
            }`}
          >
            <MoreVertical className="icon-xs" />
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              className="dropdown-glass py-spacing-1 fixed z-50 whitespace-nowrap"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {!SYSTEM_LIKE_AGENT_KEYS.has(agent.agent_key) && (
                <button
                  type="button"
                  className="body-4 text-foreground gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    setNameInputValue(agent.name)
                    setEditingName(true)
                  }}
                >
                  <Pencil className="icon-xs" />
                  Change name
                </button>
              )}
              {!isVibey && (
                <button
                  type="button"
                  className="body-4 text-foreground gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center hover:bg-white/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onPinAgent(agent.id)
                  }}
                >
                  <Pin className="icon-xs" />
                  Pin to top
                </button>
              )}
              {onFireAgent &&
                !SYSTEM_LIKE_AGENT_KEYS.has(agent.agent_key) &&
                (agent.level === 'employee' || agent.level === 'manager') && (
                  <>
                    <div className="border-border mx-spacing-2 my-spacing-1 border-t" />
                    <button
                      type="button"
                      className="body-4 gap-spacing-2 px-spacing-3 py-spacing-2 text-destructive flex w-full items-center hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        onFireAgent(agent.id)
                      }}
                    >
                      <UserX className="icon-xs" />
                      {agent.level === 'manager' ? 'Remove manager' : 'Fire employee'}
                    </button>
                  </>
                )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface TeamAgentsCarouselProps {
  variant: 'horizontal' | 'vertical'
  /** Vertical only: which outer edge draws the separator (`border-l` = team chat left of carousel; `border-r` = carousel left of main content, e.g. Skills). */
  verticalSeparatorSide?: 'left' | 'right'
  /** Vertical only: full-width main surface (mobile team home). Drops fixed width and side border. */
  fullBleedVertical?: boolean
  /** When false, hides the vertical “Hire New Agent” block (e.g. Workspace Settings → Skills). Horizontal row unchanged. Default true. */
  showHireButton?: boolean
  /** When false, hides vertical slide kebab (Change name / Pin). Default true. */
  showAgentSlideMenu?: boolean
  agents: MissionAgent[]
  selectedId: string | null
  dragAgentId: string | null
  dragOverAgentId: string | null
  roleLabelRefs: React.MutableRefObject<Record<string, HTMLSpanElement | null>>
  carouselRef: React.MutableRefObject<HTMLDivElement | null>
  setShowReadyEmployees: (value: boolean) => void
  scrollCarouselBy: (delta: CarouselScrollDelta) => void
  handleCarouselWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  setSelectedId: (id: string) => void
  setDragAgentId: (id: string | null) => void
  setDragOverAgentId: (id: string | null) => void
  setAgents: React.Dispatch<React.SetStateAction<MissionAgent[]>>
  reorderAgents: (agentKeys: string[]) => Promise<unknown>
  onPinAgent: (agentId: string) => void
  onRenameAgent: (agentId: string, newName: string) => void
  onFireAgent?: (agentId: string) => void
  pinnedAgentIds: Set<string>
}

export function TeamAgentsCarousel({
  variant,
  verticalSeparatorSide = 'left',
  fullBleedVertical = false,
  showHireButton = true,
  showAgentSlideMenu = true,
  agents,
  selectedId,
  dragAgentId,
  dragOverAgentId,
  roleLabelRefs,
  carouselRef,
  setShowReadyEmployees,
  scrollCarouselBy,
  handleCarouselWheel,
  setSelectedId,
  setDragAgentId,
  setDragOverAgentId,
  setAgents,
  reorderAgents,
  onPinAgent,
  onRenameAgent,
  onFireAgent,
  pinnedAgentIds,
}: TeamAgentsCarouselProps) {
  const isVertical = variant === 'vertical'

  return (
    <div
      className={
        isVertical
          ? fullBleedVertical
            ? 'flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden'
            : `card-glass border-border w-spacing-60 flex h-full min-h-0 shrink-0 flex-col overflow-hidden ${
                verticalSeparatorSide === 'right' ? 'border-r' : 'border-l'
              }`
          : 'card-glass px-spacing-4 py-spacing-3 shrink-0'
      }
    >
      {!isVertical && showHireButton ? (
        <div className="mb-spacing-2 gap-spacing-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowReadyEmployees(true)}
            className="button-glass-primary gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-1 flex min-w-0 flex-1 items-center"
          >
            <span className="body-3 truncate font-medium">Hire your next agent</span>
          </button>
          <div className="gap-spacing-2 hidden shrink-0 items-center sm:flex">
            <button
              type="button"
              onClick={() => scrollCarouselBy({ left: -280 })}
              className="btn-icon-glass btn-icon-glass-sm"
              aria-label="Scroll agents left"
            >
              <ChevronLeft className="icon-sm" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarouselBy({ left: 280 })}
              className="btn-icon-glass btn-icon-glass-sm"
              aria-label="Scroll agents right"
            >
              <ChevronRight className="icon-sm" />
            </button>
          </div>
        </div>
      ) : isVertical && showHireButton ? (
        <div
          className="px-spacing-2 py-spacing-2 shrink-0"
          style={{ boxShadow: '0 8px 16px -4px rgba(0,0,0,0.3)' }}
        >
          <button
            type="button"
            onClick={() => setShowReadyEmployees(true)}
            className="button-glass-primary rounded-spacing-2 body-3 px-spacing-2 py-spacing-2 w-full text-center font-medium"
          >
            Hire New Agent
          </button>
        </div>
      ) : null}

      <div
        ref={carouselRef}
        onWheel={isVertical ? undefined : handleCarouselWheel}
        className={
          isVertical
            ? 'gap-spacing-3 px-spacing-2 pb-spacing-3 pt-spacing-2 flex min-h-0 flex-1 flex-col overflow-y-auto'
            : 'gap-spacing-3 pb-spacing-1 pt-spacing-1 flex overflow-x-auto'
        }
        style={{ scrollbarWidth: 'none' }}
      >
        {agents.map((agent) => (
          <CarouselSlide
            key={agent.id}
            agent={agent}
            variant={variant}
            isSelected={agent.id === selectedId}
            dragAgentId={dragAgentId}
            dragOverAgentId={dragOverAgentId}
            roleLabelRefs={roleLabelRefs}
            setSelectedId={setSelectedId}
            setDragAgentId={setDragAgentId}
            setDragOverAgentId={setDragOverAgentId}
            setAgents={setAgents}
            reorderAgents={reorderAgents}
            onPinAgent={onPinAgent}
            onRenameAgent={onRenameAgent}
            onFireAgent={onFireAgent}
            pinnedAgentIds={pinnedAgentIds}
            showAgentSlideMenu={showAgentSlideMenu}
          />
        ))}
      </div>
    </div>
  )
}
