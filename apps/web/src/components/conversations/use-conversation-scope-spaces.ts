import { useCallback, useState } from 'react'
import {
  generalSpaceIdFromRows,
  loadCampaignSpacesSorted,
} from './conversation-scope-general-space'
import type { ConversationScopeSpace } from './conversation-scope-picker-layout'

export function useConversationScopeSpaces(activeOrgId: string | null) {
  const [spacesByCampaign, setSpacesByCampaign] = useState<
    Record<string, ConversationScopeSpace[]>
  >({})
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null)

  const fetchSpacesForCampaign = useCallback(
    (nextCampaignId: string) => {
      if (spacesByCampaign[nextCampaignId]) return
      setLoadingCampaignId(nextCampaignId)
      void loadCampaignSpacesSorted(nextCampaignId, activeOrgId)
        .then((sorted) => {
          setSpacesByCampaign((prev) => ({ ...prev, [nextCampaignId]: sorted }))
        })
        .catch(() => {
          setSpacesByCampaign((prev) => ({ ...prev, [nextCampaignId]: [] }))
        })
        .finally(() => {
          setLoadingCampaignId((current) => (current === nextCampaignId ? null : current))
        })
    },
    [activeOrgId, spacesByCampaign],
  )

  const resolveGeneralSpaceId = useCallback(
    async (nextCampaignId: string): Promise<string | null> => {
      const cached = spacesByCampaign[nextCampaignId]
      if (cached) return generalSpaceIdFromRows(cached)
      setLoadingCampaignId(nextCampaignId)
      try {
        const sorted = await loadCampaignSpacesSorted(nextCampaignId, activeOrgId)
        setSpacesByCampaign((prev) => ({ ...prev, [nextCampaignId]: sorted }))
        return generalSpaceIdFromRows(sorted)
      } catch {
        setSpacesByCampaign((prev) => ({ ...prev, [nextCampaignId]: [] }))
        return null
      } finally {
        setLoadingCampaignId((current) => (current === nextCampaignId ? null : current))
      }
    },
    [activeOrgId, spacesByCampaign],
  )

  return {
    spacesByCampaign,
    loadingCampaignId,
    fetchSpacesForCampaign,
    resolveGeneralSpaceId,
  }
}
