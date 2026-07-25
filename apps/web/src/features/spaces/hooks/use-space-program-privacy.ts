import { useEffect, useMemo, useState } from 'react'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { campaignListCacheKey, fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { loadProgramsCached, type Program } from '@/lib/programs'
import type { Space } from '../types'

export interface SpaceProgramPrivacy {
  /** True when the space's campaign lives in a private/selected Program. */
  restricted: boolean
  programName: string | null
  visibility: Program['visibility'] | null
}

/**
 * Resolve whether a space sits inside a restricted (private/selected) Program.
 * Used by the Share UI to warn that Program privacy overrides space shares —
 * people added here won't get access unless they're in the Program.
 */
export function useSpaceProgramPrivacy(activeSpace: Space | null): SpaceProgramPrivacy {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [programs, setPrograms] = useState<Program[]>([])

  useEffect(() => {
    let cancelled = false
    if (!activeSpace?.campaign_id) {
      setCampaigns([])
      setPrograms([])
      return
    }
    cachedFetch(campaignListCacheKey(activeOrgId), fetchCampaigns, { ttlMs: 60_000 })
      .then((rows) => {
        if (!cancelled) setCampaigns(rows)
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    loadProgramsCached(activeOrgId)
      .then((rows) => {
        if (!cancelled) setPrograms(rows)
      })
      .catch(() => {
        if (!cancelled) setPrograms([])
      })
    return () => {
      cancelled = true
    }
  }, [activeSpace?.campaign_id, activeOrgId])

  return useMemo(() => {
    if (!activeSpace?.campaign_id) {
      return { restricted: false, programName: null, visibility: null }
    }
    const campaign = campaigns.find((c) => c.id === activeSpace.campaign_id)
    const programId = campaign?.program_id ?? null
    if (!programId) return { restricted: false, programName: null, visibility: null }
    const program = programs.find((p) => p.id === programId)
    if (!program) return { restricted: false, programName: null, visibility: null }
    return {
      restricted: program.visibility !== 'workspace',
      programName: program.name,
      visibility: program.visibility,
    }
  }, [activeSpace?.campaign_id, campaigns, programs])
}
