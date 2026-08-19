'use client'

import type { Dispatch, SetStateAction } from 'react'
import { X } from 'lucide-react'
import { TIME_OPTIONS, TYPE_OPTIONS, type FilterState } from '../lib/channel-deliverable-filters'

export function DeliverablesActiveFilterChips({
  filterState,
  effectiveThreadFilter,
  senderLabelMap,
  campaignLabelMap,
  onFilterStateChange,
  onClearThreadFilter,
}: {
  filterState: FilterState
  effectiveThreadFilter: string | null
  senderLabelMap: Map<string, string>
  campaignLabelMap: Map<string, string>
  onFilterStateChange: Dispatch<SetStateAction<FilterState>>
  onClearThreadFilter?: () => void
}) {
  const activeCount =
    (filterState.types.size > 0 ? 1 : 0) +
    (filterState.time !== 'any' ? 1 : 0) +
    (filterState.senders.size > 0 ? 1 : 0) +
    (effectiveThreadFilter ? 1 : 0) +
    (filterState.campaigns.size > 0 ? 1 : 0)

  if (activeCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {effectiveThreadFilter && (
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
          Brainstorm
          <button
            type="button"
            onClick={() => {
              onFilterStateChange((s) => ({ ...s, threadId: null }))
              onClearThreadFilter?.()
            }}
            aria-label="Remove thread filter"
            className="hover:text-primary/70"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      )}
      {filterState.types.size > 0 && (
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
          {TYPE_OPTIONS.filter((o) => filterState.types.has(o.value))
            .map((o) => o.label)
            .join(', ')}
          <button
            type="button"
            onClick={() => onFilterStateChange((s) => ({ ...s, types: new Set() }))}
            aria-label="Remove type filter"
            className="hover:text-primary/70"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      )}
      {filterState.time !== 'any' && (
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
          {TIME_OPTIONS.find((o) => o.value === filterState.time)?.label}
          <button
            type="button"
            onClick={() => onFilterStateChange((s) => ({ ...s, time: 'any' }))}
            aria-label="Remove time filter"
            className="hover:text-primary/70"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      )}
      {filterState.senders.size > 0 && (
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
          {[...filterState.senders]
            .map((id) => senderLabelMap.get(id) ?? id)
            .slice(0, 2)
            .join(', ')}
          {filterState.senders.size > 2 && ` +${filterState.senders.size - 2}`}
          <button
            type="button"
            onClick={() => onFilterStateChange((s) => ({ ...s, senders: new Set() }))}
            aria-label="Remove sender filter"
            className="hover:text-primary/70"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      )}
      {filterState.campaigns.size > 0 && (
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
          {[...filterState.campaigns]
            .map((id) => campaignLabelMap.get(id) ?? id)
            .slice(0, 2)
            .join(', ')}
          {filterState.campaigns.size > 2 && ` +${filterState.campaigns.size - 2}`}
          <button
            type="button"
            onClick={() => onFilterStateChange((s) => ({ ...s, campaigns: new Set() }))}
            aria-label="Remove campaign filter"
            className="hover:text-primary/70"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      )}
    </div>
  )
}
