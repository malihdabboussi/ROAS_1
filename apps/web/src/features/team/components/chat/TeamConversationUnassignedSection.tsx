'use client'

import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import { Tooltip } from '@/components/ui/tooltip'
import type { TeamConversationCampaignGroup } from './team-conversations-sidebar.logic'

export interface TeamConversationUnassignedSectionProps {
  groups: TeamConversationCampaignGroup[]
  isExpanded: boolean
  onRequestAssign?: (campaign: { id: string; name: string }) => void
  onToggleExpanded: () => void
}

export function TeamConversationUnassignedSection({
  groups,
  isExpanded,
  onRequestAssign,
  onToggleExpanded,
}: TeamConversationUnassignedSectionProps) {
  if (groups.length === 0) return null

  return (
    <div className="mt-spacing-10 pt-spacing-8 space-y-0.5">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="gap-spacing-2 px-spacing-2 py-spacing-1 flex items-center text-left"
      >
        {isExpanded ? (
          <ChevronDown className="icon-xs text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="icon-xs text-muted-foreground shrink-0" />
        )}
        <span className="typo-2xs text-muted-foreground font-medium uppercase tracking-wider">
          Unassigned campaigns
        </span>
      </button>
      {isExpanded &&
        groups.map((group) => (
          <div
            key={group.key}
            className="group/unassigned nav-glass-hover-purple gap-spacing-2 px-spacing-3 py-spacing-1 text-muted-foreground flex w-full min-w-0 items-center rounded-lg border border-transparent"
          >
            <LucideIcon name={group.icon ?? 'folder-kanban'} className="icon-md shrink-0" />
            <span className="body-2 flex-1 truncate text-xs">{group.label}</span>
            {onRequestAssign && (
              <Tooltip label="Assign to this campaign" side="right">
                <button
                  type="button"
                  onClick={() => onRequestAssign({ id: group.key, name: group.label })}
                  className="text-muted-foreground hover:text-foreground flex h-4 w-4 shrink-0 items-center justify-center rounded p-0.5 opacity-0 transition-opacity group-hover/unassigned:opacity-100"
                  aria-label={`Assign ${group.label} to this campaign`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            )}
          </div>
        ))}
    </div>
  )
}
