'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { cn } from '@/lib/utils/cn'
import {
  summarizeFlowScopeLocations,
  type FlowScopeLocation,
} from '../../lib/resolve-flow-scope-locations'

export function FlowsFlowScopeBreadcrumb({
  locations,
  onNavigateToLocation,
}: {
  locations: FlowScopeLocation[]
  onNavigateToLocation?: (location: FlowScopeLocation) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const summary = useMemo(() => summarizeFlowScopeLocations(locations), [locations])

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSelect = (location: FlowScopeLocation) => {
    onNavigateToLocation?.(location)
    setOpen(false)
  }

  const campaignSegment = (
    <Tooltip
      label={FLOWS_UI.flowScopeCampaignTooltip}
      side="bottom"
      triggerClassName="inline-flex min-w-0"
    >
      <span className="max-w-[160px] truncate font-medium text-[var(--foreground)]">
        {summary.campaignLabel}
      </span>
    </Tooltip>
  )

  const spaceSegment = summary.hasMultiple ? (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={FLOWS_UI.flowScopeSpacesAria}
        className="flex min-w-0 max-w-[220px] items-center gap-1 font-medium text-[var(--foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <span className="truncate">{summary.spaceLabel}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="dropdown-menu-solid z-dropdown rounded-spacing-2 px-spacing-1 py-spacing-2 absolute left-0 top-full mt-1 max-h-72 min-w-64 overflow-y-auto">
          <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-1">
            {FLOWS_UI.flowScopeInstalledIn}
          </p>
          {locations.map((location) => {
            const label = location.isConceptSandbox
              ? FLOWS_UI.createAnythingLabel
              : `${location.campaignName} · ${location.spaceTitle}`
            return (
              <button
                key={`${location.spaceId ?? location.spaceTitle}-${location.campaignId ?? 'none'}`}
                type="button"
                onClick={() => handleSelect(location)}
                className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
                <Check className="icon-xs shrink-0 opacity-0" aria-hidden />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  ) : (
    <Tooltip label={FLOWS_UI.flowScopeSpaceTooltip} side="bottom" triggerClassName="inline-flex min-w-0">
      <button
        type="button"
        onClick={() => {
          const location = locations[0]
          if (location) onNavigateToLocation?.(location)
        }}
        className="max-w-[160px] truncate font-medium text-[var(--foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        {summary.spaceLabel}
      </button>
    </Tooltip>
  )

  return (
    <>
      {campaignSegment}
      <span className="text-[var(--color-muted-foreground)]/50 select-none">/</span>
      {spaceSegment}
    </>
  )
}
