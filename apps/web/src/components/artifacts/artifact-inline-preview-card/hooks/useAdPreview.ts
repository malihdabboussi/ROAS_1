'use client'

import { useEffect, useState } from 'react'
import { fetchAd } from '@/lib/artifacts'

export type AdPreviewRow = {
  headline: string | null
  primary_text: string | null
  generated_tsx: string | null
  image_url: string | null
  placement: string | null
}

export function useAdPreview(artifactId: string): AdPreviewRow | null {
  const [ad, setAd] = useState<AdPreviewRow | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAd(artifactId).then((data) => {
      if (cancelled || !data) return
      setAd(data as AdPreviewRow)
    })
    return () => {
      cancelled = true
    }
  }, [artifactId])

  return ad
}
