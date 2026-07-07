'use client'

import Script from 'next/script'
import { useEffect, useId, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export function TurnstileWidget({
  siteKey,
  theme = 'auto',
  onToken,
}: {
  siteKey: string
  theme?: 'light' | 'dark' | 'auto'
  onToken: (token: string | null) => void
}) {
  const containerId = useId().replace(/[:]/g, '_')
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  // Stable ref so useEffect doesn't re-mount the widget when the parent passes
  // a new inline `onToken` function on every render (caused infinite render loops).
  const onTokenRef = useRef(onToken)
  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!scriptReady || !window.turnstile) return
    const el = document.getElementById(containerId)
    if (!el) return
    widgetIdRef.current = window.turnstile.render(el, {
      sitekey: siteKey,
      theme,
      callback: (token) => onTokenRef.current(token),
      'expired-callback': () => onTokenRef.current(null),
      'error-callback': () => onTokenRef.current(null),
    })
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [scriptReady, siteKey, theme, containerId])

  return (
    <>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />
      <div id={containerId} />
    </>
  )
}
