'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createAdSet, updateAd } from '@/features/studio/services/artifact-preview.service'
import type { Ad, AdCampaign } from '@/features/studio/types'

export function AdUngroupedAssignPanel({
  ad,
  adCampaigns,
  onAssigned,
}: {
  ad: Ad
  adCampaigns: AdCampaign[]
  onAssigned: () => void
}) {
  const [adCampaignId, setAdCampaignId] = useState(adCampaigns[0]?.id ?? '')
  const [adSetId, setAdSetId] = useState('')
  const [busy, setBusy] = useState(false)

  const adSets = useMemo(() => {
    const camp = adCampaigns.find((c) => c.id === adCampaignId)
    return camp?.ad_sets ?? []
  }, [adCampaignId, adCampaigns])

  const assignToSet = async (targetAdSetId: string) => {
    setBusy(true)
    try {
      await updateAd(ad.id, { ad_set_id: targetAdSetId })
      toast.success('Ad assigned to ad set')
      onAssigned()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign ad')
    } finally {
      setBusy(false)
    }
  }

  const createSetAndAssign = async () => {
    if (!adCampaignId) {
      toast.error('Create an ad campaign first')
      return
    }
    setBusy(true)
    try {
      const created = await createAdSet(adCampaignId, 'Default Ad Set')
      await updateAd(ad.id, { ad_set_id: created.id })
      toast.success('Ad set created and ad assigned')
      onAssigned()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create ad set')
    } finally {
      setBusy(false)
    }
  }

  if (adCampaigns.length === 0) {
    return (
      <p className="typo-caption text-muted-foreground">
        Create an ad campaign in Campaigns view, then assign this ad.
      </p>
    )
  }

  return (
    <div className="gap-spacing-3 flex flex-col">
      <div className="gap-spacing-2 flex flex-col">
        <label className="typo-caption text-muted-foreground">Ad campaign</label>
        <select
          value={adCampaignId}
          onChange={(e) => {
            setAdCampaignId(e.target.value)
            setAdSetId('')
          }}
          className="body-3 rounded-spacing-2 border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
        >
          {adCampaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || 'Untitled Campaign'}
            </option>
          ))}
        </select>
      </div>
      {adSets.length > 0 ? (
        <div className="gap-spacing-2 flex flex-col">
          <label className="typo-caption text-muted-foreground">Ad set</label>
          <select
            value={adSetId}
            onChange={(e) => setAdSetId(e.target.value)}
            className="body-3 rounded-spacing-2 border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="">Select ad set…</option>
            {adSets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || 'Untitled Ad Set'}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!adSetId || busy}
            onClick={() => void assignToSet(adSetId)}
            className="button-primary body-3 rounded-spacing-2 px-3 py-2 font-semibold disabled:opacity-40"
          >
            Assign to ad set
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void createSetAndAssign()}
          className="button-primary body-3 rounded-spacing-2 px-3 py-2 font-semibold disabled:opacity-40"
        >
          Create ad set & assign
        </button>
      )}
    </div>
  )
}
