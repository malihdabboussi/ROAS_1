'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useCampaignMode } from '@/features/studio/contexts/CampaignModeContext'
import { fetchCampaigns } from '@/features/studio/services/campaign.service'
import { CampaignsHub } from './_components/CampaignsHub'

export default function CampaignsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setActiveCampaign } = useCampaignMode()
  const [ready, setReady] = useState(searchParams.get('view') !== 'dashboard')
  const redirected = useRef(false)

  useEffect(() => {
    if (searchParams.get('view') !== 'dashboard' || redirected.current) {
      setReady(true)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchCampaigns()
        if (cancelled || data.length === 0) {
          if (!cancelled) setReady(true)
          return
        }
        const first = data[0]
        if (!first) {
          setReady(true)
          return
        }
        redirected.current = true
        const icon = ((first.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban'
        setActiveCampaign(first.id, first.name ?? 'Campaign', icon)
        router.replace(`/campaigns/${first.id}?view=dashboard`)
      } catch {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, searchParams, setActiveCampaign])

  if (!ready) return null
  return <CampaignsHub />
}
