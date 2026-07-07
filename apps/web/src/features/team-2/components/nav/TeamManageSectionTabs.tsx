'use client'

import { LayoutGrid, Users } from 'lucide-react'
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
        'relative flex min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-hover-subtle)]',
        selected
          ? 'text-[var(--foreground)]'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
      )}
    >
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
      {selected ? (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--foreground)]" />
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
    <div className="flex w-full min-w-0 shrink-0 items-center border-b border-[var(--border)] px-4">
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
      </div>
    </div>
  )
}
