'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, TriangleAlert } from 'lucide-react'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { backendPost } from '@/lib/api/backend-client'
import { cn } from '@/lib/utils/cn'
import { portalTargetPathFromRoute } from './portal-target-path'

type EmbedSession = {
  success: true
  code: string
  embed_url: string
  expires_at: string
}

export function PageGraderPortalSurface({ active }: { active: boolean }) {
  const pathname = usePathname() ?? '/home'
  const searchParams = useSearchParams()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wasActive = useRef(false)
  const [opened, setOpened] = useState(false)
  const [session, setSession] = useState<EmbedSession | null>(null)
  const [currentPath, setCurrentPath] = useState('/clients')
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const spaces = useSpacesStore((state) => state.spaces)
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const spaceId = searchParams.get('space') || activeSpaceId
  const space = useMemo(() => spaces.find((row) => row.id === spaceId) ?? null, [spaceId, spaces])
  const targetPath = portalTargetPathFromRoute({
    pathname,
    portalPath: searchParams.get('portal_path'),
    space,
  })

  const portalOrigin = useMemo(() => {
    if (!session?.embed_url) return null
    try {
      return new URL(session.embed_url).origin
    } catch {
      return null
    }
  }, [session?.embed_url])

  const prepareSession = useCallback(async (nextPath: string) => {
    setLoading(true)
    setAuthenticated(false)
    setError(null)
    setCurrentPath(nextPath)
    try {
      const next = await backendPost<EmbedSession>('/api/integrations/page-grader/embed-session', {
        parent_origin: window.location.origin,
        target_path: nextPath,
      })
      setSession(next)
      setReloadKey((value) => value + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Portal could not be opened')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active) {
      wasActive.current = false
      return
    }
    setOpened(true)
    if (wasActive.current) return
    wasActive.current = true
    void prepareSession(targetPath)
  }, [active, prepareSession, targetPath])

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
    void prepareSession(targetPath)
  }

  const openPortal = () => {
    if (!portalOrigin) return
    window.open(new URL(currentPath, portalOrigin).toString(), '_blank', 'noopener,noreferrer')
  }

  if (!opened) return null

  return (
    <section
      className={cn(
        'bg-background relative h-full min-h-0 w-full overflow-hidden',
        !active && 'hidden',
      )}
      aria-hidden={!active}
      data-page-grader-portal
    >
      {session ? (
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={session.embed_url}
          title="ROAS Portal"
          className="bg-background h-full w-full border-0"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      ) : null}

      <div className="z-dropdown p-spacing-3 pointer-events-none absolute inset-0 flex items-end justify-end">
        <div className="gap-spacing-1 rounded-spacing-2 p-spacing-1 border-border/80 bg-background/90 pointer-events-auto flex items-center border shadow-sm backdrop-blur">
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
      </div>

      {(loading || (!authenticated && session)) && !error ? (
        <div className="bg-background absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="text-primary h-6 w-6 animate-spin" aria-hidden />
            <p className="body-3 text-muted-foreground">Opening Portal...</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="bg-background absolute inset-0 flex items-center justify-center p-6">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <TriangleAlert className="text-destructive h-7 w-7" aria-hidden />
            <div>
              <h2 className="body-2 font-semibold">Portal connection interrupted</h2>
              <p className="body-3 text-muted-foreground mt-1">{error}</p>
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
