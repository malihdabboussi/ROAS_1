'use client'

import { useMemo, type MouseEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import type { MissionAgentSkill } from '@/lib/agents'
import { cn } from '@/lib/utils/cn'
import { formatSkillName } from '../../../constants/team.constants'
import type { AgentInfoSkillPeekWorkflow } from './AgentInfoSkillPeekPortal'

export type AgentInfoSkillCatalogKey = 'custom' | 'platform'

type AgentInfoSkillCatalogSectionProps = {
  title: string
  catalogKey: AgentInfoSkillCatalogKey
  first: boolean
  collapsedMap: Partial<Record<AgentInfoSkillCatalogKey, boolean>>
  onToggle: (key: AgentInfoSkillCatalogKey) => void
  skills: MissionAgentSkill[]
  nameButtonClass: string
  showPeek: (
    event: MouseEvent<HTMLElement>,
    title: string,
    body: string,
    workflow: AgentInfoSkillPeekWorkflow,
  ) => void
  scheduleHide: () => void
  denied: Set<string>
  pendingKey: string | null
  onSkillToggle: (skillKey: string, enabled: boolean) => void
}

export function AgentInfoSkillCatalogSection({
  title,
  catalogKey,
  first,
  collapsedMap,
  onToggle,
  skills,
  nameButtonClass,
  showPeek,
  scheduleHide,
  denied,
  pendingKey,
  onSkillToggle,
}: AgentInfoSkillCatalogSectionProps) {
  const collapsed = collapsedMap[catalogKey] === true

  const sortedSkills = useMemo(
    () =>
      [...skills].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    [skills],
  )

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => onToggle(catalogKey)}
        aria-expanded={!collapsed}
        className={cn(
          'group/section typo-section-label text-muted-foreground hover:text-foreground gap-spacing-1 flex w-full items-center rounded-lg px-2 pb-1 text-left transition-colors',
          first ? 'pt-1' : 'pt-4',
        )}
      >
        <span>{title}</span>
        <ChevronRight
          className={cn(
            'icon-sm shrink-0 opacity-0 transition-[opacity,transform] duration-200 group-hover/section:opacity-100 group-focus-visible/section:opacity-100',
            collapsed ? 'rotate-0' : 'rotate-90',
          )}
          aria-hidden
        />
      </button>
      {!collapsed ? (
        <div className="gap-spacing-1 px-spacing-2 pb-spacing-1 flex flex-col">
          {sortedSkills.map((row) => {
            const skillKey = row.skill_key
            const enabled = !denied.has(skillKey)
            const pending = pendingKey === skillKey
            return (
              <div
                key={row.id}
                className={cn(
                  'body-3 hover:bg-hover-subtle pl-spacing-2 pr-spacing-1 py-spacing-1 gap-spacing-2 flex w-full items-center rounded-xl transition-colors',
                  nameButtonClass,
                )}
              >
                <button
                  type="button"
                  className={cn('min-w-0 flex-1 truncate text-left', !enabled && 'opacity-50')}
                  onMouseEnter={(event) =>
                    showPeek(event, formatSkillName(row.name), row.description ?? '', null)
                  }
                  onMouseLeave={scheduleHide}
                >
                  {formatSkillName(row.name)}
                </button>
                <Switch
                  checked={enabled}
                  disabled={pending}
                  onCheckedChange={(next) => onSkillToggle(skillKey, next)}
                  aria-label={enabled ? `Disable ${row.name}` : `Enable ${row.name}`}
                />
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
