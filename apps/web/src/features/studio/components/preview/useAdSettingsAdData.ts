import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { fetchAd } from '../../services/artifact-preview.service'
import type { Ad } from '../../types'

interface UseAdSettingsAdDataParams {
  adId: string
  initialAd?: Ad
}

export function useAdSettingsAdData({ adId, initialAd }: UseAdSettingsAdDataParams): {
  ad: Ad | null
  setAd: Dispatch<SetStateAction<Ad | null>>
  loading: boolean
  error: string | null
} {
  const [ad, setAd] = useState<Ad | null>(initialAd ?? null)
  const [loading, setLoading] = useState(!initialAd)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialAd && initialAd.id === adId) setAd(initialAd)
  }, [adId, initialAd])

  useEffect(() => {
    if (initialAd) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAd(adId)
      .then((row) => {
        if (!cancelled) setAd(row)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_AD)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adId, initialAd])

  return { ad, setAd, loading, error }
}
