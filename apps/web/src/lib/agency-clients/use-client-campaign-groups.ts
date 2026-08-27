'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchAgencyClientCampaigns, fetchAgencyClients } from './agency-clients-api'
import { buildClientCampaignGroups, type ClientCampaignGroup } from './client-campaign-mapping'

/**
 * Lazily loads Page Grader clients → campaigns once `open` first turns true.
 * `groups === null` means still loading. Failed fetches retry the next open.
 */
export function useClientCampaignGroups(open: boolean): {
  groups: ClientCampaignGroup[] | null
  failed: boolean
} {
  const [groups, setGroups] = useState<ClientCampaignGroup[] | null>(null)
  const [failed, setFailed] = useState(false)
  const attemptedOpen = useRef(false)

  useEffect(() => {
    if (!open) {
      attemptedOpen.current = false
      return
    }
    if (groups !== null && !failed) return
    if (attemptedOpen.current) return
    attemptedOpen.current = true
    let cancelled = false
    void Promise.all([fetchAgencyClientCampaigns(undefined, true), fetchAgencyClients('', true)])
      .then(([campaignResponse, clientResponse]) => {
        if (cancelled) return
        setFailed(false)
        setGroups(
          buildClientCampaignGroups(
            campaignResponse?.campaigns ?? [],
            clientResponse?.clients ?? [],
          ),
        )
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
        setGroups([])
      })
    return () => {
      cancelled = true
    }
  }, [open, groups, failed])

  return { groups, failed }
}
