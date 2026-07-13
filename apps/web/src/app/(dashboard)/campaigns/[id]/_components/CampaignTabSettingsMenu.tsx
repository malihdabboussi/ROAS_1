'use client'

import { useEffect, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import {
  CAMPAIGN_TAB_LABELS,
  TOGGLEABLE_CAMPAIGN_TAB_IDS,
  type ToggleableCampaignTabId,
} from '../_lib/campaign-nav-tabs'

interface CampaignTabSettingsMenuProps {
  visibleTabIds: ToggleableCampaignTabId[]
  onVisibleTabIdsChange: (ids: ToggleableCampaignTabId[]) => void
}

export function CampaignTabSettingsMenu({
  visibleTabIds,
  onVisibleTabIdsChange,
}: CampaignTabSettingsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const toggle = (id: ToggleableCampaignTabId) => {
    const set = new Set(visibleTabIds)
    if (set.has(id)) {
      if (id === 'overview') return
      set.delete(id)
    } else {
      set.add(id)
    }
    if (set.size === 0) return
    onVisibleTabIdsChange(TOGGLEABLE_CAMPAIGN_TAB_IDS.filter((tabId) => set.has(tabId)))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Campaign tab settings"
        onClick={() => setOpen((v) => !v)}
        className="chip-glass-neutral flex h-9 w-9 items-center justify-center rounded-lg"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      {open ? (
        <div className="surface-card border-border rounded-spacing-2 absolute right-0 top-full z-50 mt-2 w-56 border p-2 shadow-lg">
          <p className="body-4 text-muted-foreground px-2 py-1 uppercase tracking-wide">
            Visible tabs
          </p>
          {TOGGLEABLE_CAMPAIGN_TAB_IDS.map((id) => {
            const checked = visibleTabIds.includes(id)
            const disabled = id === 'overview'
            return (
              <label
                key={id}
                className={`rounded-spacing-2 body-3 flex cursor-pointer items-center gap-2 px-2 py-2 ${
                  disabled ? 'opacity-60' : 'hover:bg-hover-subtle'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(id)}
                  className="rounded border-border"
                />
                <span>{CAMPAIGN_TAB_LABELS[id]}</span>
              </label>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
