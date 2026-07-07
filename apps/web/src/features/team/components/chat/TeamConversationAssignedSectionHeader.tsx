'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ChevronRight, Filter, Plus, User, Users } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  getAgentFilterLabel,
  type TeamConversationAgent,
} from './team-conversations-sidebar.logic'

export interface TeamConversationAssignedSectionHeaderProps {
  agentFilter?: Set<string>
  isExpanded: boolean
  mobilePageLayout: boolean
  teamAgents: TeamConversationAgent[]
  onAgentFilterChange?: (keys: Set<string>) => void
  onNewCampaign: () => void
  onToggleExpanded: () => void
}

export function TeamConversationAssignedSectionHeader({
  agentFilter,
  isExpanded,
  mobilePageLayout,
  onAgentFilterChange,
  onNewCampaign,
  onToggleExpanded,
  teamAgents,
}: TeamConversationAssignedSectionHeaderProps) {
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const agentDropdownRef = useRef<HTMLDivElement | null>(null)
  const isAllAgents = !agentFilter || agentFilter.size === 0
  const filterLabel = getAgentFilterLabel(agentFilter, teamAgents)

  useEffect(() => {
    if (!agentDropdownOpen) return
    const handle = (e: MouseEvent) => {
      if (agentDropdownRef.current?.contains(e.target as Node)) return
      setAgentDropdownOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [agentDropdownOpen])

  return (
    <div className="flex items-center justify-between px-2 py-1">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex items-center gap-2 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="icon-xs text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="icon-xs text-muted-foreground shrink-0" />
        )}
        <span className="typo-2xs text-muted-foreground font-medium uppercase tracking-wider">
          Assigned campaigns
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="assigned-actions"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center gap-1"
          >
            {onAgentFilterChange && teamAgents.length > 1 && (
              <div className="relative" ref={agentDropdownRef}>
                <Tooltip label={filterLabel} side="top">
                  <button
                    type="button"
                    onClick={() => setAgentDropdownOpen((p) => !p)}
                    className={`typo-2xs flex h-4 items-center justify-center gap-0.5 rounded px-1 transition-colors ${
                      !isAllAgents
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-label="Filter by agent"
                  >
                    <Filter className="h-2.5 w-2.5" />
                  </button>
                </Tooltip>
                {agentDropdownOpen && (
                  <div className="dropdown-menu-solid z-dropdown rounded-spacing-2 p-spacing-1 absolute right-0 top-full mt-1 w-44">
                    <button
                      type="button"
                      onClick={() => {
                        onAgentFilterChange(new Set())
                        setAgentDropdownOpen(false)
                      }}
                      className={`px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 gap-spacing-2 flex w-full items-center text-left transition-colors ${
                        isAllAgents
                          ? 'text-foreground bg-hover-subtle'
                          : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                      }`}
                    >
                      <Users className="icon-xs shrink-0" />
                      <span className="flex-1 truncate">All agents</span>
                      {isAllAgents && <Check className="icon-xs shrink-0" />}
                    </button>
                    {teamAgents.map((agent) => {
                      const selected = agentFilter?.has(agent.agent_key) ?? false
                      return (
                        <button
                          key={agent.agent_key}
                          type="button"
                          onClick={() => {
                            const next = new Set(agentFilter ?? new Set<string>())
                            if (selected) next.delete(agent.agent_key)
                            else next.add(agent.agent_key)
                            onAgentFilterChange(next)
                          }}
                          className={`px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 gap-spacing-2 flex w-full items-center text-left transition-colors ${
                            selected
                              ? 'text-foreground bg-hover-subtle'
                              : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                          }`}
                        >
                          {agent.image_url ? (
                            <img
                              src={agent.image_url}
                              alt=""
                              className="h-3.5 w-3.5 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <User className="icon-xs shrink-0" />
                          )}
                          <span className="flex-1 truncate">{agent.name}</span>
                          {selected && <Check className="icon-xs shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {!mobilePageLayout ? (
              <Tooltip label="New campaign" side="right">
                <button
                  type="button"
                  onClick={onNewCampaign}
                  className="text-muted-foreground hover:text-foreground flex h-4 w-4 items-center justify-center rounded transition-colors"
                  aria-label="New campaign"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </Tooltip>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
