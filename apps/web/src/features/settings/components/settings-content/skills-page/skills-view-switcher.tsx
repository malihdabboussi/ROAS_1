'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { VibeyLoadingSphereSimple } from '@/components/vibey/vibey-loading-sphere-simple'
import type { MissionAgent } from '@/features/mission-control/types'
import { RoleEmblem } from '@/features/team/components/RoleEmblem'
import { isSkillWriteLockedAgent } from '@/lib/agents/system-agent-contracts'
import { cn } from '@/lib/utils/cn'
import { SkillsAgentTabMenuDropdown } from './skills-agent-tab-menu/SkillsAgentTabMenuDropdown'

const VIEW_TAB_STRIP_FADE_PX = 28

type AgentTabMenuState = {
  agent: MissionAgent
  pointerPosition: { x: number; y: number }
}

export type SkillsAgentTabMenuActions = {
  onCopyAgentKey: (agent: MissionAgent) => void | Promise<void>
  onCopyAgentId: (agent: MissionAgent) => void | Promise<void>
  onOpenInNewTab: (agent: MissionAgent) => void
  onNewSkill: (agent: MissionAgent) => void
  onUploadSkill: (agent: MissionAgent) => void
  onEnableAll: (agent: MissionAgent) => void | Promise<void>
  onOpenChat: (agent: MissionAgent) => void
}

function viewTabStripMaskStyle(fadeEdges: {
  left: boolean
  right: boolean
}): CSSProperties | undefined {
  const f = VIEW_TAB_STRIP_FADE_PX
  if (!fadeEdges.left && !fadeEdges.right) return undefined
  let gradient: string
  if (fadeEdges.left && fadeEdges.right) {
    gradient = `linear-gradient(90deg, transparent 0px, black ${f}px, black calc(100% - ${f}px), transparent 100%)`
  } else if (fadeEdges.right) {
    gradient = `linear-gradient(90deg, black 0%, black calc(100% - ${f}px), transparent 100%)`
  } else {
    gradient = `linear-gradient(90deg, transparent 0px, black ${f}px, black 100%)`
  }
  return {
    maskImage: gradient,
    WebkitMaskImage: gradient,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  }
}

function AgentTabAvatar({ agent }: { agent: MissionAgent }) {
  const showVibeyAnimation = agent.agent_key === 'vibey' && !agent.image_url

  if (agent.image_url) {
    return (
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md">
        <img
          src={agent.image_url}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
    )
  }

  if (showVibeyAnimation) {
    return (
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/5">
        <VibeyLoadingSphereSimple size="small" state="idle" showBackground={false} />
      </span>
    )
  }

  return (
    <span className="badge-glass badge-glass-sm flex h-5 w-5 shrink-0 items-center justify-center rounded-md">
      <RoleEmblem roleKey={agent.agent_key} size="sm" />
    </span>
  )
}

function SkillsViewTab({
  selected,
  onSelect,
  onContextMenu,
  icon,
  label,
}: {
  selected: boolean
  onSelect: () => void
  onContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void
  icon?: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={cn(
        'relative flex min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-hover-subtle)]',
        selected
          ? 'text-[var(--foreground)]'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
      )}
    >
      {icon ?? null}
      <span className="max-w-[140px] truncate">{label}</span>
      {selected ? (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--foreground)]" />
      ) : null}
    </button>
  )
}

export function SkillsViewSwitcher({
  agents,
  activeViewKey,
  onSelectView,
  agentTabMenuActions,
  hideBottomBorder = false,
}: {
  agents: MissionAgent[]
  activeViewKey: 'all' | string
  onSelectView: (viewKey: 'all' | string) => void
  agentTabMenuActions: SkillsAgentTabMenuActions
  hideBottomBorder?: boolean
}) {
  const tabsScrollRef = useRef<HTMLDivElement | null>(null)
  const [tabStripFade, setTabStripFade] = useState({ left: false, right: false })
  const [agentTabMenuState, setAgentTabMenuState] = useState<AgentTabMenuState | null>(null)

  const updateTabStripFade = useCallback(() => {
    const el = tabsScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const epsilon = 2
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    const canScroll = maxScroll > epsilon
    setTabStripFade({
      left: canScroll && scrollLeft > epsilon,
      right: canScroll && scrollLeft < maxScroll - epsilon,
    })
  }, [])

  useLayoutEffect(() => {
    updateTabStripFade()
  }, [agents, activeViewKey, updateTabStripFade])

  useEffect(() => {
    const el = tabsScrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => updateTabStripFade())
    ro.observe(el)
    el.addEventListener('scroll', updateTabStripFade, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', updateTabStripFade)
    }
  }, [updateTabStripFade])

  const tabStripMaskStyle = useMemo(() => viewTabStripMaskStyle(tabStripFade), [tabStripFade])

  const openAgentTabMenu = (agent: MissionAgent, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setAgentTabMenuState({ agent, pointerPosition: { x: e.clientX, y: e.clientY } })
  }

  const menuAgent = agentTabMenuState?.agent ?? null
  const canWriteSkills = menuAgent ? !isSkillWriteLockedAgent(menuAgent.agent_key) : false

  return (
    <>
      <div
        className={cn(
          'flex w-full min-w-0 items-center px-4',
          !hideBottomBorder && 'border-b border-[var(--border)]',
        )}
      >
        <div
          ref={tabsScrollRef}
          className="scrollbar-thin flex min-h-0 min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain"
          style={tabStripMaskStyle}
        >
          <SkillsViewTab
            selected={activeViewKey === 'all'}
            onSelect={() => onSelectView('all')}
            label="All skills"
          />
          {agents.map((agent) => (
            <SkillsViewTab
              key={agent.id}
              selected={activeViewKey === agent.agent_key}
              onSelect={() => onSelectView(agent.agent_key)}
              onContextMenu={(e) => openAgentTabMenu(agent, e)}
              icon={<AgentTabAvatar agent={agent} />}
              label={agent.name}
            />
          ))}
        </div>
      </div>

      {agentTabMenuState ? (
        <SkillsAgentTabMenuDropdown
          agent={agentTabMenuState.agent}
          pointerPosition={agentTabMenuState.pointerPosition}
          canWriteSkills={canWriteSkills}
          onClose={() => setAgentTabMenuState(null)}
          onCopyAgentKey={() => agentTabMenuActions.onCopyAgentKey(agentTabMenuState.agent)}
          onCopyAgentId={() => agentTabMenuActions.onCopyAgentId(agentTabMenuState.agent)}
          onOpenInNewTab={() => agentTabMenuActions.onOpenInNewTab(agentTabMenuState.agent)}
          onNewSkill={() => agentTabMenuActions.onNewSkill(agentTabMenuState.agent)}
          onUploadSkill={() => agentTabMenuActions.onUploadSkill(agentTabMenuState.agent)}
          onEnableAll={() => agentTabMenuActions.onEnableAll(agentTabMenuState.agent)}
          onOpenChat={() => agentTabMenuActions.onOpenChat(agentTabMenuState.agent)}
        />
      ) : null}
    </>
  )
}
