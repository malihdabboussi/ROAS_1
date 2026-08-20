'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PageSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { fetchAgencyClient } from '@/lib/agency-clients'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

export function AgencyClientRouteResolver({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchAgencyClient(clientId, true)
      .then((workspace) => {
        if (cancelled) return
        const campaignId = workspace.mapping?.campaign_id
        if (!campaignId)
          throw new Error('This client is not mapped to a ROAS Client Workspace yet.')
        const params = new URLSearchParams({ client: clientId })
        router.replace(`/campaigns/${encodeURIComponent(campaignId)}?${params}`)
      })
      .catch((reason) => {
        if (cancelled) return
        setError(
          reason instanceof Error ? reason.message : AGENCY_CLIENT_MESSAGES.LOAD_CLIENT_ERROR,
        )
      })

    return () => {
      cancelled = true
    }
  }, [clientId, router])

  if (error) {
    return (
      <main className="p-spacing-8">
        <p className="surface-card body-2 text-destructive rounded-spacing-3 p-spacing-4">
          {error}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-full">
      <PageSkeleton label="Opening client workspace…" />
    </main>
  )
}
