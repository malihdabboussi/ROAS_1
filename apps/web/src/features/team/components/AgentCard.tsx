'use client'

import { useState } from 'react'
import type { MissionAgent } from '@/features/mission-control/types'
import { formatSkillName } from '../constants/team.constants'

const LEVEL_BADGES: Record<string, { label: string; cls: string }> = {
  c_level: { label: 'C-Level', cls: 'chip-glass-purple' },
  manager: { label: 'Manager', cls: 'chip-glass-blue' },
  system: { label: 'System', cls: 'chip-glass-orange' },
  employee: { label: 'Employee', cls: 'chip-glass-green' },
}

const STATUS_COLORS: Record<string, string> = {
  online: 'indicator-dot-glass-green',
  idle: 'indicator-dot-glass-yellow',
  working: 'indicator-dot-glass-blue',
  offline: 'indicator-dot-glass-muted',
}

interface AgentCardProps {
  agent: MissionAgent
  selected: boolean
  onSelect: () => void
  onRename: (agentKey: string, newName: string) => Promise<void>
}

export function AgentCard({ agent, selected, onSelect, onRename }: AgentCardProps) {
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(agent.name)

  const level = agent.level || 'employee'
  const badge = LEVEL_BADGES[level] ?? { label: 'Employee', cls: 'chip-glass-green' }
  const styleLabel = (agent.config as Record<string, string>)?.style_label

  const handleSave = async () => {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== agent.name) {
      await onRename(agent.agent_key, trimmed)
    }
    setEditing(false)
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-spacing-3 p-spacing-4 w-full border text-left transition-all ${
        selected ? 'chip-glass-blue' : 'surface-card border-subtle hover-subtle'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="gap-spacing-3 flex items-center">
          <div className="relative">
            {agent.image_url ? (
              <div className="rounded-spacing-2 h-10 w-10 overflow-hidden bg-white/5">
                <img src={agent.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="rounded-spacing-2 flex h-10 w-10 items-center justify-center bg-white/5 text-xl">
                {level === 'c_level'
                  ? '⚡'
                  : level === 'manager'
                    ? '📋'
                    : level === 'system'
                      ? '🤝'
                      : '🎯'}
              </div>
            )}
            <span
              className={`absolute -bottom-0.5 -right-0.5 ${STATUS_COLORS[agent.status] || STATUS_COLORS.offline}`}
            />
          </div>
          <div>
            {editing ? (
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={() => void handleSave()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave()
                  if (e.key === 'Escape') {
                    setNameValue(agent.name)
                    setEditing(false)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="input-glass rounded-spacing-1 px-spacing-2 py-0.5 text-sm font-semibold"
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setEditing(true)
                }}
                className="text-foreground text-sm font-semibold"
                title="Double-click to rename"
              >
                {agent.name}
              </span>
            )}
            <p className="body-4 text-muted-foreground">{agent.role}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="mt-spacing-3 gap-spacing-2 flex flex-wrap items-center">
        <span className="body-4 text-muted-foreground capitalize">{agent.status}</span>
        {styleLabel && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="body-4 text-muted-foreground">{styleLabel}</span>
          </>
        )}
        {agent.skills && agent.skills.length > 0 && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="body-4 text-muted-foreground">{agent.skills.length} skills</span>
          </>
        )}
      </div>

      {agent.skills && agent.skills.length > 0 && (
        <div className="mt-spacing-3 flex flex-wrap gap-1">
          {agent.skills.map((skill) => (
            <span key={skill} className="badge-glass badge-glass-muted body-4">
              {formatSkillName(skill)}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}
