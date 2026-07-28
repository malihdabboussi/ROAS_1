'use client'

import { ExternalLink, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { backendPost } from '@/lib/api/backend-client'
import { cn } from '@/lib/utils/cn'

type EmbedSession = {
  success: true
  code: string
  embed_url: string
  expires_at: string
}

export function PageGraderPortalSurface({ active }: { active: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [opened, setOpened] = useState(false)
  const [session, setSession] = useState<EmbedSession | null>(null)
  const [currentPath, setCurrentPath] = useState('/clients')
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const portalOrigin = useMemo(() => {
    if (!session?.embed_url) return null
    try {
      return new URL(session.embed_url).origin
    } catch {
      return null
    }
  }, [session?.embed_url])

  const prepareSession = useCallback(async () => {
    setLoading(true)
    setAuthenticated(false)
    setError(null)
    try {
      const next = await backendPost<EmbedSession>(
        '/api/integrations/page-grader/embed-session',
        {
          parent_origin: window.location.origin,
          target_path: '/clients',
        },
      )
      setSession(next)
      setReloadKey((value) => value + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Portal could not be opened')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    setOpened(true)
    if (!session && !loading && !error) void prepareSession()
  }, [active, error, loading, prepareSession, session])

  useEffect(() => {
    if (!session || !portalOrigin) return
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== portalOrigin || event.source !== iframeRef.current?.contentWindow) return
      const message = event.data as { type?: string; path?: string; message?: string }
      if (message?.type === 'page-grader.portal.ready') {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'roas.portal.authenticate', version: 1, code: session.code },
          portalOrigin,
        )
        return
      }
      if (message?.type === 'page-grader.portal.authenticated') {
        setAuthenticated(true)
        setLoading(false)
        setError(null)
        return
      }
      if (message?.type === 'page-grader.portal.navigated' && message.path?.startsWith('/')) {
        setCurrentPath(message.path)
        setAuthenticated(true)
        setLoading(false)
        return
      }
      if (message?.type === 'page-grader.portal.error') {
        setError(message.message || 'Portal sign-in was interrupted')
        setLoading(false)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [portalOrigin, session])

  const retry = () => {
    setSession(null)
    setError(null)
    void prepareSession()
  }

  const openPortal = () => {
    if (!portalOrigin) return
    window.open(new URL(currentPath, portalOrigin).toString(), '_blank', 'noopener,noreferrer')
  }

  if (!opened) return null

  return (
    <section
      className={cn('relative h-full min-h-0 w-full overflow-hidden bg-background', !active && 'hidden')}
      aria-hidden={!active}
      data-page-grader-portal
    >
      {session ? (
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={session.embed_url}
          title="ROAS Portal"
          className="h-full w-full border-0 bg-background"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      ) : null}

      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-md border border-border/80 bg-background/90 p-1 shadow-sm backdrop-blur">
        <button
          type="button"
          title="Refresh Portal"
          aria-label="Refresh Portal"
          onClick={retry}
          className="shell-topbar-icon-btn"
        >
          <RefreshCw className="icon-sm" aria-hidden />
        </button>
        <button
          type="button"
          title="Open Portal in new tab"
          aria-label="Open Portal in new tab"
          onClick={openPortal}
          disabled={!portalOrigin}
          className="shell-topbar-icon-btn"
        >
          <ExternalLink className="icon-sm" aria-hidden />
        </button>
      </div>

      {(loading || (!authenticated && session)) && !error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
            <p className="body-3 text-muted-foreground">Opening Portal...</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background p-6">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <TriangleAlert className="h-7 w-7 text-destructive" aria-hidden />
            <div>
              <h2 className="body-2 font-semibold">Portal connection interrupted</h2>
              <p className="body-3 mt-1 text-muted-foreground">{error}</p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="button-glass-purple body-3 flex h-9 items-center gap-2 rounded-md px-3 font-medium"
            >
              <RefreshCw className="icon-sm" aria-hidden />
              Try again
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
