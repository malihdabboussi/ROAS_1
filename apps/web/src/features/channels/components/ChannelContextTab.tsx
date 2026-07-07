'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, FolderKanban, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getCachedCampaigns,
  prefetchOrgCampaigns,
  useCampaignCacheVersion,
} from '@/features/home/lib/home-feed-campaign-cache'
import { fetchCampaigns } from '@/features/studio/services/campaign.service'
import type { Campaign } from '@/features/studio/types'
import { useChannels } from '../hooks/use-channels'
import type { Channel } from '../services/channels.service'

function readBoundCampaignId(channel: Channel): string | null {
  const value = channel.metadata?.default_campaign_id
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function ChannelContextTab({ channel }: { channel: Channel }) {
  const { updateChannel } = useChannels()
  const cacheVersion = useCampaignCacheVersion()
  const [personalCampaigns, setPersonalCampaigns] = useState<Campaign[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const boundCampaignId = readBoundCampaignId(channel)
  // First binding may be set by anyone who can post (matches the API rule);
  // changing or clearing an existing one requires manage rights.
  const canEdit = Boolean(channel.can_manage) || !boundCampaignId

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const load = channel.org_id
      ? prefetchOrgCampaigns(channel.org_id)
      : fetchCampaigns().then((list) => {
          if (!cancelled) setPersonalCampaigns(list)
          return list
        })
    load
      .catch(() => {
        if (!cancelled) toast.error('Could not load campaigns')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [channel.org_id, channel.id])

  const campaigns = useMemo(() => {
    const list = channel.org_id
      ? (getCachedCampaigns(channel.org_id) ?? [])
      : (personalCampaigns ?? [])
    return list.filter((campaign) => campaign.status !== 'archived')
    // cacheVersion re-reads the org campaign cache after prefetch resolves
  }, [channel.org_id, personalCampaigns, cacheVersion])

  const boundCampaign = campaigns.find((campaign) => campaign.id === boundCampaignId) ?? null

  const applyBinding = async (campaignId: string | null) => {
    if (savingId !== null || campaignId === boundCampaignId) return
    setSavingId(campaignId ?? 'clear')
    try {
      await updateChannel(channel.id, { default_campaign_id: campaignId })
      toast.success(campaignId ? 'Channel context updated' : 'Channel context cleared')
    } catch {
      toast.error('Could not update channel context')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div>
          <h3 className="body-2 text-foreground font-semibold">CONTEXT ACCESS</h3>
          <p className="body-4 text-muted-foreground mt-1">
            Agents in this channel use the assigned campaign for avatars, offers, and brain lookups.
            Without one, they fall back to your General campaign — which is usually empty.
          </p>
        </div>

        <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2.5">
          <FolderKanban className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
          <span className="body-4 text-muted-foreground">Current context:</span>
          <span className="body-4 text-foreground font-medium">
            {boundCampaignId ? (boundCampaign?.name ?? 'Campaign') : 'None assigned'}
          </span>
        </div>

        {!canEdit && (
          <p className="body-4 text-muted-foreground">
            Only channel admins can change the assigned context.
          </p>
        )}

        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-6">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="body-4">Loading campaigns…</span>
          </div>
        ) : campaigns.length === 0 ? (
          <p className="body-4 text-muted-foreground py-4">
            No campaigns available. Create a campaign first to assign it as channel context.
          </p>
        ) : (
          <div className="border-border divide-border divide-y rounded-lg border">
            {campaigns.map((campaign) => {
              const isBound = campaign.id === boundCampaignId
              const isSaving = savingId === campaign.id
              return (
                <button
                  key={campaign.id}
                  type="button"
                  disabled={!canEdit || savingId !== null}
                  onClick={() => void applyBinding(campaign.id)}
                  className={`hover:bg-hover-subtle flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors first:rounded-t-lg last:rounded-b-lg disabled:cursor-default ${
                    isBound ? 'bg-primary/5' : ''
                  }`}
                >
                  <span className="body-4 text-foreground min-w-0 truncate font-medium">
                    {campaign.name}
                  </span>
                  {isSaving ? (
                    <Loader2 className="text-muted-foreground h-4 w-4 shrink-0 animate-spin" />
                  ) : isBound ? (
                    <Check className="text-primary h-4 w-4 shrink-0" aria-hidden />
                  ) : null}
                </button>
              )
            })}
          </div>
        )}

        {canEdit && boundCampaignId && (
          <button
            type="button"
            disabled={savingId !== null}
            onClick={() => void applyBinding(null)}
            className="body-4 text-muted-foreground hover:text-foreground self-start transition-colors disabled:opacity-60"
          >
            {savingId === 'clear' ? 'Clearing…' : 'Clear context assignment'}
          </button>
        )}
      </div>
    </div>
  )
}
