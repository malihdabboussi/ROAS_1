'use client'

import { useEffect, useRef, useState } from 'react'
import { refreshAssetUrl } from '@/lib/services/media-api'
import { healRedactedSupabaseStorageUrls } from '@/lib/utils/chat-markdown.utils'

type ImageLoadState = 'loading' | 'loaded' | 'error'

const DEFAULT_MAX_ATTEMPTS = 4
const RETRY_DELAY_MS = 320

export type UseResilientImageSrcOptions = {
  maxAttempts?: number
  /** When set, expired signed URLs are refreshed via the media API before giving up. */
  mediaAssetId?: string | null
}

function normalizeImageUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  return healRedactedSupabaseStorageUrls(trimmed)
}

/**
 * Signed / just-uploaded media URLs can fail the first paint briefly.
 * Retry a few times, then refresh the asset URL when we have an id, before
 * surfacing an error so cards don't flash failure.
 */
export function useResilientImageSrc(
  url: string,
  maxAttemptsOrOptions: number | UseResilientImageSrcOptions = DEFAULT_MAX_ATTEMPTS,
) {
  const options: UseResilientImageSrcOptions =
    typeof maxAttemptsOrOptions === 'number'
      ? { maxAttempts: maxAttemptsOrOptions }
      : maxAttemptsOrOptions
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const mediaAssetId = options.mediaAssetId?.trim() || null

  const [resolvedUrl, setResolvedUrl] = useState(() => normalizeImageUrl(url))
  const [loadState, setLoadState] = useState<ImageLoadState>(() =>
    normalizeImageUrl(url) ? 'loading' : 'error',
  )
  const [attempt, setAttempt] = useState(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshAttemptedRef = useRef(false)
  const refreshInFlightRef = useRef(false)

  useEffect(() => {
    const next = normalizeImageUrl(url)
    setResolvedUrl(next)
    setLoadState(next ? 'loading' : 'error')
    setAttempt(0)
    refreshAttemptedRef.current = false
    refreshInFlightRef.current = false
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [url, mediaAssetId])

  const imgSrc =
    resolvedUrl && attempt > 0
      ? `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}_r=${attempt}`
      : resolvedUrl

  const onLoad = () => setLoadState('loaded')

  const scheduleRetry = () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    retryTimerRef.current = setTimeout(() => {
      setLoadState('loading')
      setAttempt((n) => n + 1)
    }, RETRY_DELAY_MS)
  }

  const tryRefreshSignedUrl = async (): Promise<boolean> => {
    if (!mediaAssetId || refreshAttemptedRef.current || refreshInFlightRef.current) return false
    refreshAttemptedRef.current = true
    refreshInFlightRef.current = true
    try {
      const refreshed = await refreshAssetUrl(mediaAssetId)
      const nextUrl = normalizeImageUrl(refreshed?.url ?? '')
      if (!nextUrl) return false
      setResolvedUrl(nextUrl)
      setAttempt(0)
      setLoadState('loading')
      return true
    } catch {
      return false
    } finally {
      refreshInFlightRef.current = false
    }
  }

  const onError = () => {
    if (!resolvedUrl) {
      setLoadState('error')
      return
    }
    if (attempt + 1 < maxAttempts) {
      scheduleRetry()
      return
    }
    void tryRefreshSignedUrl().then((refreshed) => {
      if (!refreshed) setLoadState('error')
    })
  }

  const retry = () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (!resolvedUrl && !mediaAssetId) {
      setLoadState('error')
      return
    }
    refreshAttemptedRef.current = false
    setLoadState('loading')
    if (mediaAssetId) {
      void tryRefreshSignedUrl().then((refreshed) => {
        if (!refreshed) {
          setAttempt((n) => n + 1)
        }
      })
      return
    }
    setAttempt((n) => n + 1)
  }

  return { loadState, imgSrc, onLoad, onError, retry }
}
