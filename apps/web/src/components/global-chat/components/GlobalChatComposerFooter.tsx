'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useCachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns'
import {
  workContextAttachmentDescription,
  workContextAttachmentLabel,
} from '../config/work-context.config'
import { useGlobalChatStore } from '../store/use-global-chat-store'

/**
 * Attached-context chip for the composer. Read-only status plus detach —
 * adding or changing context lives in the work summary's Connections section.
 */
export function GlobalChatComposerFooter() {
  const workContext = useGlobalChatStore((s) => s.workContext)
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const roster = useGlobalChatStore((s) => s.roster)
  const { data: spaceRows } = useCachedSpaces()
  const spaces = useMemo(() => spaceRows ?? [], [spaceRows])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    if (!workContext.campaignId) return
    let cancelled = false
    void fetchCampaigns()
      .then((campaignRows) => {
        if (!cancelled) setCampaigns(campaignRows)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [workContext.campaignId])

  const selectedSpaceTitle = spaces.find((space) => space.id === workContext.spaceId)?.title
  const selectedCampaignName = campaigns.find(
    (campaign) => campaign.id === workContext.campaignId,
  )?.name
  const attachmentLabel = workContextAttachmentLabel(
    workContext,
    selectedSpaceTitle,
    selectedCampaignName,
  )
  const activeAgentName =
    roster.find((entry) => entry.agent_key === activeAgentKey)?.display_name?.trim() ||
    activeAgentKey
  const attachmentDescription = workContextAttachmentDescription(workContext, {
    activeAgentName,
    spaceTitle: selectedSpaceTitle,
    campaignName: selectedCampaignName,
  })

  if (!attachmentLabel) return null

  return (
    <div className="gap-spacing-1 flex min-w-0 items-center">
      <div className="badge-glass badge-glass-sm badge-glass-purple gap-spacing-1 flex min-w-0 items-center font-medium">
        <button
          type="button"
          onClick={() => setWorkContext({ surface: 'general' })}
          className="hover:text-foreground shrink-0"
          aria-label={`Detach ${attachmentLabel} from chat`}
        >
          <X className="icon-xs" aria-hidden />
        </button>
        <Tooltip
          label={attachmentDescription ?? attachmentLabel}
          wide
          delayMs={200}
          triggerClassName="min-w-0"
        >
          <span className="block min-w-0 truncate">{attachmentLabel}</span>
        </Tooltip>
      </div>
    </div>
  )
}
