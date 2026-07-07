'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  campaignListCacheKey,
  fetchAgentCampaignAssignments,
  fetchCampaigns,
  type Campaign,
} from '@/lib/campaigns'

export function useTeamContainerCampaignData(selectedAgentKey: string, activeOrgId: string | null) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [assignedCampaigns, setAssignedCampaigns] = useState<Campaign[]>([])
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaignActionLoading, setCampaignActionLoading] = useState(false)
  const [campaignError, setCampaignError] = useState<string | null>(null)
  const [dragAgentId, setDragAgentId] = useState<string | null>(null)
  const [dragOverAgentId, setDragOverAgentId] = useState<string | null>(null)

  const nonGeneralCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) => {
        const config = (campaign.config ?? {}) as Record<string, unknown>
        const systemKind =
          typeof config.system_kind === 'string' ? config.system_kind.toLowerCase() : ''
        const isSystem = config.isSystem === true
        const normalizedName = campaign.name.trim().toLowerCase()
        return !(normalizedName === 'general' || systemKind === 'general' || isSystem)
      }),
    [campaigns],
  )

  const generalCampaignId = useMemo(() => {
    const general = campaigns.find((c) => {
      const config = (c.config ?? {}) as Record<string, unknown>
      const systemKind =
        typeof config.system_kind === 'string' ? config.system_kind.toLowerCase() : ''
      const normalizedName = c.name.trim().toLowerCase()
      return normalizedName === 'general' || systemKind === 'general'
    })
    return general?.id ? String(general.id) : undefined
  }, [campaigns])

  const campaignsListCacheKey = useMemo(
    () => campaignListCacheKey(activeOrgId),
    [activeOrgId],
  )

  useEffect(() => {
    let cancelled = false
    cachedFetch(campaignsListCacheKey, () => fetchCampaigns(), { ttlMs: 60_000 })
      .then((rows) => {
        if (!cancelled) setCampaigns(rows)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [campaignsListCacheKey])

  const refreshCampaigns = useCallback(async () => {
    try {
      invalidateCachedFetch(campaignsListCacheKey)
      const rows = await cachedFetch(campaignsListCacheKey, () => fetchCampaigns(), {
        ttlMs: 60_000,
      })
      setCampaigns(rows)
    } catch {
      setCampaigns([])
    }
  }, [campaignsListCacheKey])

  useEffect(() => {
    if (!selectedAgentKey || nonGeneralCampaigns.length === 0) {
      setAssignedCampaigns([])
      return
    }
    let cancelled = false
    setCampaignLoading(true)
    setCampaignError(null)
    fetchAgentCampaignAssignments(selectedAgentKey)
      .then((campaignIds) => {
        if (cancelled) return
        const assignedSet = new Set(campaignIds)
        const assigned = nonGeneralCampaigns.filter((campaign) => assignedSet.has(campaign.id))
        setAssignedCampaigns(assigned)
      })
      .catch((err) => {
        if (cancelled) return
        setAssignedCampaigns([])
        setCampaignError(err instanceof Error ? err.message : 'Failed to load campaign assignments')
      })
      .finally(() => {
        if (!cancelled) setCampaignLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nonGeneralCampaigns, selectedAgentKey])

  return {
    campaigns,
    assignedCampaigns,
    setAssignedCampaigns,
    campaignLoading,
    campaignActionLoading,
    setCampaignActionLoading,
    campaignError,
    setCampaignError,
    dragAgentId,
    setDragAgentId,
    dragOverAgentId,
    setDragOverAgentId,
    nonGeneralCampaigns,
    generalCampaignId,
    refreshCampaigns,
  }
}
