'use client'

import type { CampaignContext } from '@/app/(dashboard)/campaigns/[id]/_lib/types'
import { LucideIcon } from '@/components/ui/IconPicker'
import { rpsoCoverageLevel, type RpsoCoverageLevel } from '../lib/rpso-coverage'

export interface StrategyCampaignRow {
  id: string
  name: string
  icon: string
  context: CampaignContext
}

function dotClass(level: RpsoCoverageLevel): string {
  if (level === 'full') return 'bg-emerald-500'
  if (level === 'limited') return 'bg-orange-500'
  return 'bg-muted-foreground/40'
}

interface CampaignStrategyTreeProps {
  campaigns: StrategyCampaignRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Desktop: fixed 200px column; mobile: full width */
  variant?: 'narrow' | 'fluid'
}

export function CampaignStrategyTree({
  campaigns,
  selectedId,
  onSelect,
  variant = 'narrow',
}: CampaignStrategyTreeProps) {
  const widthClass = variant === 'narrow' ? 'w-[200px] shrink-0' : 'w-full min-w-0 shrink-0'
  return (
    <div className={`pb-spacing-2 flex h-full min-h-0 flex-col ${widthClass}`}>
      <div className="card-glass lg:rounded-spacing-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="px-spacing-3 py-spacing-2 flex-shrink-0">
          <p className="typo-caption text-muted-foreground uppercase">Campaigns</p>
        </div>
        <div className="px-spacing-2 pb-spacing-4 min-h-0 flex-1 overflow-y-auto">
          {campaigns.length === 0 ? (
            <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-2">
              No campaigns yet
            </p>
          ) : (
            <ul className="space-y-spacing-1">
              {campaigns.map((row) => {
                const level = rpsoCoverageLevel(row.context)
                const selected = selectedId === row.id
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(row.id)}
                      className={`hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-2 flex w-full items-center text-left transition-colors ${selected ? 'bg-hover-subtle' : ''}`}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${dotClass(level)}`}
                        aria-hidden
                      />
                      <LucideIcon name={row.icon} className="icon-sm text-foreground shrink-0" />
                      <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                        {row.name}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
