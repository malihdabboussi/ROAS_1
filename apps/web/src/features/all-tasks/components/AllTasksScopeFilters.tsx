'use client'

import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'
import type { TaskRollupView } from '@/lib/tasks'
import { cn } from '@/lib/utils/cn'

type FilterOption = { id: string; name: string }

export function AllTasksScopeFilters({
  scope,
  programId,
  campaignId,
  programs,
  campaigns,
  onScopeChange,
  onProgramChange,
  onCampaignChange,
}: {
  scope: TaskRollupView
  programId: string
  campaignId: string
  programs: FilterOption[]
  campaigns: FilterOption[]
  onScopeChange: (scope: TaskRollupView) => void
  onProgramChange: (programId: string) => void
  onCampaignChange: (campaignId: string) => void
}) {
  return (
    <div className="gap-spacing-2 flex flex-wrap items-center">
      <div className="gap-spacing-1 border-border flex rounded-lg border p-1">
        {[
          { id: 'my' as const, label: 'My Tasks' },
          { id: 'all' as const, label: 'All Tasks' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={scope === option.id}
            onClick={() => onScopeChange(option.id)}
            className={cn(
              'button-compact',
              scope === option.id
                ? 'button-glass-accent'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <SettingsSelect
        value={programId}
        options={[
          { value: '', label: 'All programs' },
          ...programs.map((program) => ({ value: program.id, label: program.name })),
        ]}
        onChange={onProgramChange}
        ariaLabel="Filter by program"
        wrapperClassName="relative w-spacing-44"
        triggerClassName="input-glass rounded-spacing-2 gap-spacing-2 h-spacing-9 px-spacing-3 flex w-full items-center justify-between"
      />
      <SettingsSelect
        value={campaignId}
        options={[
          { value: '', label: 'All campaigns' },
          ...campaigns.map((campaign) => ({ value: campaign.id, label: campaign.name })),
        ]}
        onChange={onCampaignChange}
        ariaLabel="Filter by campaign"
        wrapperClassName="relative w-spacing-44"
        triggerClassName="input-glass rounded-spacing-2 gap-spacing-2 h-spacing-9 px-spacing-3 flex w-full items-center justify-between"
      />
    </div>
  )
}
