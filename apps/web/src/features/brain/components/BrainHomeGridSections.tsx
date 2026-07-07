'use client'

import type { ReactNode } from 'react'
import type { MissionAgent } from '@/lib/agents'
import { spaceGroupBadgeGlassClass } from '@/lib/ui/group-badge-glass'
import type { BrainScopeNavOption } from '../hooks/use-brain-scope-nav-options'
import { SCOPE_SECTIONS, sectionIncludesScope } from '../lib/brain-home-state'
import { BrainHomeAddAgentCard } from './BrainHomeAddAgentCard'

export function BrainHomeGridSections({
  scopeOptions,
  sortedFiltered,
  agentsWithoutBrain,
  isOrg,
  renderBrainCard,
  onAddAgentBrain,
}: {
  scopeOptions: BrainScopeNavOption[]
  sortedFiltered: BrainScopeNavOption[]
  agentsWithoutBrain: MissionAgent[]
  isOrg: boolean
  renderBrainCard: (option: BrainScopeNavOption) => ReactNode
  onAddAgentBrain: () => void
}) {
  return (
    <div className="gap-spacing-5 flex flex-col">
      {SCOPE_SECTIONS.map((section) => {
        const inScope = scopeOptions.filter((option) =>
          sectionIncludesScope(section, option.scopeType),
        )
        const items = sortedFiltered.filter((option) =>
          sectionIncludesScope(section, option.scopeType),
        )
        const isAgentSection = section.id === 'agent'
        const readyAgentCount = agentsWithoutBrain.length
        const showAgentAddCard = isAgentSection && readyAgentCount > 0
        const hasGridContent = items.length > 0 || showAgentAddCard
        const showSection =
          section.id === 'company'
            ? isOrg
            : isAgentSection
              ? inScope.length > 0 || readyAgentCount > 0 || Boolean(section.emptyText)
              : inScope.length > 0 || Boolean(section.emptyText)
        if (!showSection) return null
        const sectionCount = items.length + (showAgentAddCard ? 1 : 0)
        return (
          <section key={section.id} className="gap-spacing-2 flex flex-col">
            <header className="gap-spacing-2 flex items-center px-1">
              <span
                className={`rounded-spacing-2 inline-flex items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider ${spaceGroupBadgeGlassClass(section.color)}`}
              >
                {section.title}
              </span>
              <span className="text-xs text-muted-foreground">{sectionCount}</span>
            </header>
            {!hasGridContent ? (
              <p className="body-4 text-muted-foreground px-1">{section.emptyText}</p>
            ) : (
              <div className="gap-spacing-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {showAgentAddCard ? (
                  <BrainHomeAddAgentCard
                    agents={agentsWithoutBrain}
                    count={readyAgentCount}
                    onClick={onAddAgentBrain}
                  />
                ) : null}
                {items.map(renderBrainCard)}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
