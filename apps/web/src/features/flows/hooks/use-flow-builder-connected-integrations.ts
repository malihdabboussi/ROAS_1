'use client'

import { useCallback, useEffect, useState } from 'react'
import { useOrgStore } from '@/lib/org/org-context-store'
import { fetchConnectedIntegrationIds } from '@/lib/integrations/fetch-connected-integration-ids'
import { useUserRole } from '@/hooks/use-user-role'

export function useFlowBuilderConnectedIntegrations(enabled = true) {
  const { isSuperadmin } = useUserRole()
  const isOrg = useOrgStore((state) => state.isOrgContext())
  const [connectedIntegrationIds, setConnectedIntegrationIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setConnectedIntegrationIds(await fetchConnectedIntegrationIds({ isOrg }))
    } finally {
      setLoading(false)
    }
  }, [enabled, isOrg])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    connectedIntegrationIds,
    loading,
    isPlatformAdmin: isSuperadmin,
    reload,
  }
}
