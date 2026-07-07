'use client'

import { ArrowLeft, Filter } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchCampaignFunnels,
  type Funnel,
} from '@/features/studio/services/artifact-preview.service'

export function FunnelsListSubView(props: {
  campaignId: string
  onBack: () => void
  onOpenFunnel: (funnelId: string) => void
}) {
  const { campaignId, onBack, onOpenFunnel } = props
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const list = await fetchCampaignFunnels(campaignId)
        if (!cancelled) setFunnels(list)
      } catch {
        if (!cancelled) setFunnels([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [campaignId])

  const classic = useMemo(
    () => funnels.filter((f) => f.funnel_type !== 'website'),
    [funnels],
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="body-3 font-semibold text-[var(--foreground)]">Funnels</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <p className="body-3 px-2 py-4 text-[var(--color-muted-foreground)]">Loading…</p>
        ) : classic.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <Filter className="h-8 w-8 text-[var(--color-muted-foreground)] opacity-30" />
            <p className="body-3 text-[var(--color-muted-foreground)]">No funnels yet</p>
            <p className="typo-caption text-[var(--color-muted-foreground)]">
              Create a funnel in the Artifacts tab to configure its settings here.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {classic.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onOpenFunnel(f.id)}
                  className="flex w-full min-w-0 items-center rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)] focus-visible:bg-[var(--color-hover-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span className="body-3 min-w-0 flex-1 truncate font-medium text-[var(--foreground)]">
                    {f.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
