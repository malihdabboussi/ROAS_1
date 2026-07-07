'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { cn } from '@/lib/utils/cn'

function campaignIconName(c: Campaign): string {
  const fromConfig = c.config?.icon
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : 'folder'
}

function campaignIconColor(c: Campaign) {
  const raw = (c.config as Record<string, unknown> | undefined)?.icon_color
  return typeof raw === 'string' ? getIconColor(raw) : getIconColor(undefined)
}

export function FlowsCampaignBreadcrumbDropdown({
  selectedCampaignId,
  onSelectCampaign,
}: {
  selectedCampaignId: string | null
  onSelectCampaign: (campaignId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  )

  useEffect(() => {
    void fetchCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={FLOWS_UI.filterByCampaign}
        className="flex min-w-0 max-w-[220px] items-center gap-1 font-medium text-[var(--foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <span className="truncate">
          {selectedCampaign?.name ?? FLOWS_UI.allCampaigns}
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="dropdown-menu-solid z-dropdown rounded-spacing-2 px-spacing-1 py-spacing-2 absolute left-0 top-full mt-1 max-h-72 min-w-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onSelectCampaign(null)
              setOpen(false)
            }}
            className={cn(
              'body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors',
              !selectedCampaignId && 'nav-glass-selected-purple',
            )}
          >
            <span className="min-w-0 flex-1 truncate font-medium">{FLOWS_UI.allCampaigns}</span>
            {!selectedCampaignId ? <Check className="icon-xs text-primary shrink-0" /> : null}
          </button>
          {campaigns.map((campaign) => {
            const selected = campaign.id === selectedCampaignId
            const cIcon = campaignIconName(campaign)
            const cColor = campaignIconColor(campaign)
            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => {
                  onSelectCampaign(campaign.id)
                  setOpen(false)
                }}
                className={cn(
                  'body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors',
                  selected && 'nav-glass-selected-purple',
                )}
              >
                <LucideIcon name={cIcon} className={cn('icon-xs shrink-0', cColor.textColor)} />
                <span className="min-w-0 flex-1 truncate font-medium">{campaign.name}</span>
                {selected ? <Check className="icon-xs text-primary shrink-0" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
