'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { resolveMeetingWorkspaceLinks } from '@/features/home/lib/resolve-meeting-workspace-links'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchCampaign } from '@/lib/campaigns/campaign-api'
import { fetchSpaceById } from '@/lib/spaces/spaces-api'

type SpaceSummaryLike = { id: string; title?: string | null; name?: string | null }

function spaceTitle(space: SpaceSummaryLike | null | undefined, fallback: string): string {
  const title = space?.title?.trim() || space?.name?.trim()
  return title || fallback
}

export function MeetingWorkspaceContextLinks({
  spaceId,
  contextLinks,
}: {
  spaceId: string
  contextLinks?: ReadonlyArray<Record<string, unknown>> | null
  /** @deprecated Kept for call-site compatibility; layout is always compact chips. */
  placement?: 'header' | 'sidebar'
}) {
  // Names resolve via shared space/campaign APIs — do not import Spaces feature store from Home.
  const links = resolveMeetingWorkspaceLinks({ spaceId, contextLinks, spaces: [] })
  const [spaceLabel, setSpaceLabel] = useState(links.space.label)
  const [campaignLabel, setCampaignLabel] = useState(links.campaign?.label ?? 'Campaign')
  const [linkedLabels, setLinkedLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(links.linkedSpaces.map((space) => [space.id, space.label])),
  )

  useEffect(() => {
    setSpaceLabel(links.space.label)
    if (links.space.label !== 'Space') return
    let cancelled = false
    void cachedFetch(
      `space:${links.space.id}`,
      () => fetchSpaceById<SpaceSummaryLike>(links.space.id),
      {
        ttlMs: 60_000,
      },
    )
      .then((space) => {
        if (!cancelled) setSpaceLabel(spaceTitle(space, 'Space'))
      })
      .catch(() => {
        if (!cancelled) setSpaceLabel('Space')
      })
    return () => {
      cancelled = true
    }
  }, [links.space.id, links.space.label])

  useEffect(() => {
    const campaignId = links.campaign?.id
    if (!campaignId) {
      setCampaignLabel('Campaign')
      return
    }
    let cancelled = false
    void cachedFetch(`campaign:${campaignId}`, () => fetchCampaign(campaignId), { ttlMs: 60_000 })
      .then((campaign) => {
        if (cancelled) return
        setCampaignLabel(campaign.name?.trim() || 'Campaign')
      })
      .catch(() => {
        if (!cancelled) setCampaignLabel('Campaign')
      })
    return () => {
      cancelled = true
    }
  }, [links.campaign?.id])

  const linkedSpaceKey = links.linkedSpaces.map((space) => `${space.id}:${space.label}`).join('|')

  useEffect(() => {
    let cancelled = false
    const rows = linkedSpaceKey
      ? linkedSpaceKey.split('|').map((entry) => {
          const [id, ...labelParts] = entry.split(':')
          return { id, label: labelParts.join(':') || 'Space' }
        })
      : []
    const next: Record<string, string> = {}
    const pending = rows.map(async (space) => {
      if (space.label !== 'Space') {
        next[space.id] = space.label
        return
      }
      try {
        const row = await cachedFetch(
          `space:${space.id}`,
          () => fetchSpaceById<SpaceSummaryLike>(space.id),
          { ttlMs: 60_000 },
        )
        next[space.id] = spaceTitle(row, 'Space')
      } catch {
        next[space.id] = 'Space'
      }
    })
    void Promise.all(pending).then(() => {
      if (!cancelled) setLinkedLabels(next)
    })
    return () => {
      cancelled = true
    }
  }, [linkedSpaceKey])

  const chipClass =
    'badge-glass badge-glass-sm badge-glass-purple gap-spacing-1 inline-flex max-w-[12rem] items-center font-medium'

  return (
    <nav
      aria-label="Meeting linked destinations"
      className="gap-spacing-2 flex min-w-0 flex-wrap items-center"
    >
      <Link href={links.space.href} className={chipClass} title={spaceLabel}>
        <span className="body-4 truncate">{spaceLabel}</span>
      </Link>
      {links.campaign ? (
        <Link href={links.campaign.href} className={chipClass} title={campaignLabel}>
          <span className="body-4 truncate">{campaignLabel}</span>
        </Link>
      ) : null}
      {links.linkedSpaces.map((space) => (
        <Link
          key={space.id}
          href={space.href}
          className={chipClass}
          title={linkedLabels[space.id] ?? space.label}
        >
          <span className="body-4 truncate">{linkedLabels[space.id] ?? space.label}</span>
        </Link>
      ))}
    </nav>
  )
}
