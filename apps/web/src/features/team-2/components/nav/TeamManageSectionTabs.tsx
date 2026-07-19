'use client'

import { LayoutGrid, UserRoundSearch, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { TeamManageSection } from '../../lib/team-manage-nav'

function SectionTab({
  selected,
  onSelect,
  icon,
  label,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'hover:bg-secondary relative flex min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
        selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span className="max-w-36 truncate">{label}</span>
      {selected ? (
        <span className="bg-foreground absolute bottom-0 left-2 right-2 h-0.5 rounded-full" />
      ) : null}
    </button>
  )
}

export function TeamManageSectionTabs({
  activeSection,
  onSelectSection,
}: {
  activeSection: TeamManageSection
  onSelectSection: (section: TeamManageSection) => void
}) {
  return (
    <div className="border-border flex w-full min-w-0 shrink-0 items-center border-b px-4">
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1">
        <SectionTab
          selected={activeSection === 'teams'}
          onSelect={() => onSelectSection('teams')}
          icon={<Users className="h-3.5 w-3.5 shrink-0" />}
          label="Teams"
        />
        <SectionTab
          selected={activeSection === 'agents'}
          onSelect={() => onSelectSection('agents')}
          icon={<LayoutGrid className="h-3.5 w-3.5 shrink-0" />}
          label="Agents"
        />
        <SectionTab
          selected={activeSection === 'people'}
          onSelect={() => onSelectSection('people')}
          icon={<UserRoundSearch className="h-3.5 w-3.5 shrink-0" />}
          label="People"
        />
      </div>
    </div>
  )
}
