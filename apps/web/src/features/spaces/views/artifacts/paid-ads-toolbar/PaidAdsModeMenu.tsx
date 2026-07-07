'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Check, Layers, LayoutGrid, Target } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { PAID_ADS_MODE_OPTIONS } from '@/features/spaces/lib/paid-ads-display-mode'
import type { PaidAdsHierarchyMode } from '@/features/spaces/types/space-schema'

const MODE_ICONS: Record<PaidAdsHierarchyMode, ComponentType<{ className?: string }>> = {
  structure: Target,
  ad_sets: Layers,
  creatives: LayoutGrid,
}

export function PaidAdsModeMenu({
  hierarchyMode,
  canSwitchMode,
  onHierarchyModeChange,
}: {
  hierarchyMode: PaidAdsHierarchyMode
  canSwitchMode: boolean
  onHierarchyModeChange: (mode: PaidAdsHierarchyMode) => void
}) {
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const modeBtnRef = useRef<HTMLButtonElement>(null)
  const modeMenuRef = useRef<HTMLDivElement>(null)
  const ModeIcon = MODE_ICONS[hierarchyMode]

  useEffect(() => {
    if (!modeMenuOpen) return
    const handle = (event: MouseEvent) => {
      const target = event.target as Node
      if (!modeBtnRef.current?.contains(target) && !modeMenuRef.current?.contains(target)) {
        setModeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle, true)
    return () => document.removeEventListener('mousedown', handle, true)
  }, [modeMenuOpen])

  const handleModeSelect = (mode: PaidAdsHierarchyMode) => {
    onHierarchyModeChange(mode)
    setModeMenuOpen(false)
  }

  return (
    <div ref={modeMenuRef} className="relative shrink-0">
      <Tooltip label="View: Campaigns, Ad sets, or Ad Creatives" side="bottom">
        <span className="inline-flex shrink-0 items-center">
          <button
            ref={modeBtnRef}
            type="button"
            onClick={() => setModeMenuOpen((open) => !open)}
            className={`inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
              modeMenuOpen
                ? 'bg-hover-subtle text-foreground'
                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
            }`}
            aria-label="Campaigns, Ad sets, or Ad Creatives"
            aria-expanded={modeMenuOpen}
          >
            <ModeIcon className="icon-sm" />
          </button>
        </span>
      </Tooltip>
      {modeMenuOpen ? (
        <div className="dropdown-menu-solid z-dropdown absolute left-0 top-full mt-1 w-44 rounded-xl py-spacing-1 shadow-lg">
          {PAID_ADS_MODE_OPTIONS.map((option) => {
            const Icon = MODE_ICONS[option.id]
            const selected = hierarchyMode === option.id
            const disabled = !canSwitchMode && option.id !== 'structure'
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => handleModeSelect(option.id)}
                className="body-4 flex w-full items-center justify-between px-spacing-3 py-spacing-1 transition-colors hover:bg-hover-subtle disabled:pointer-events-none disabled:opacity-40"
              >
                <span className="flex items-center gap-spacing-2 text-foreground">
                  <Icon className="icon-sm text-muted-foreground" />
                  {option.label}
                </span>
                {selected ? <Check className="icon-xs shrink-0 text-primary" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
