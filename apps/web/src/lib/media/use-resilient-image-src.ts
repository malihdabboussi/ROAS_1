'use client'

import { useEffect, useRef, useState } from 'react'

type ImageLoadState = 'loading' | 'loaded' | 'error'

const DEFAULT_MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 280

/**
 * Signed / just-uploaded media URLs can fail the first paint briefly.
 * Retry a few times before surfacing an error so cards don't flash failure.
 */
export function useResilientImageSrc(url: string, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
  const [loadState, setLoadState] = useState<ImageLoadState>('loading')
  const [attempt, setAttempt] = useState(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoadState('loading')
    setAttempt(0)
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [url])

  const imgSrc =
    attempt > 0 ? `${url}${url.includes('?') ? '&' : '?'}_r=${attempt}` : url

  const onLoad = () => setLoadState('loaded')

  const onError = () => {
    if (attempt + 1 < maxAttempts) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => {
        setLoadState('loading')
        setAttempt((n) => n + 1)
      }, RETRY_DELAY_MS)
      return
    }
    setLoadState('error')
  }

  const retry = () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    setLoadState('loading')
    setAttempt((n) => n + 1)
  }

  return { loadState, imgSrc, onLoad, onError, retry }
}
