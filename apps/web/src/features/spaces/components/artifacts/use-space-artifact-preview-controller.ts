'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchFunnelWithPagesCached,
  fetchPresentationCached,
  invalidatePresentationPreviewCache,
  type Ad,
  type FunnelPage,
} from '@/lib/artifacts'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import {
  fetchCampaignThemePreview,
  loadFunnelPagePreview,
  selectionToResource,
  sortPages,
  toSelectedFunnel,
  toSelectedPresentation,
  type PageContent,
  type SelectedFunnel,
  type SelectedPresentation,
  type SelectedResource,
  type Viewport,
} from './use-space-artifact-preview-controller.helpers'
import { useSpaceArtifactPreviewRealtime } from './use-space-artifact-preview-realtime'

interface UseSpaceArtifactPreviewControllerParams {
  campaignId: string
  selection: ArtifactPreviewSelection
}

/**
 * Single-resource preview controller for the Spaces artifact slide-over.
 * Skips the team-studio catalog (`useArtifactsData`) entirely; only fetches the row the user clicked.
 * Each preview component (`OfferPreview`, `AdPreview`, ...) handles its own per-row fetch + realtime;
 * this hook only adds the metadata that `ArtifactPreviewPane` reads at the toolbar/frame level
 * (funnel pages, theme CSS, presentation status), and narrow realtime for those rows.
 */
export function useSpaceArtifactPreviewController({
  campaignId,
  selection,
}: UseSpaceArtifactPreviewControllerParams) {
  const [selectedResource, setSelectedResource] = useState<SelectedResource>(() =>
    selectionToResource(selection),
  )
  const [selectedFunnel, setSelectedFunnel] = useState<SelectedFunnel | null>(null)
  const [selectedPresentation, setSelectedPresentation] = useState<SelectedPresentation | null>(
    null,
  )
  const [funnelPages, setFunnelPages] = useState<FunnelPage[]>([])
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  const [pageContent, setPageContent] = useState<PageContent | null>(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null)
  const activeThemeIdRef = useRef<string | null>(null)
  const [themePreviewCss, setThemePreviewCss] = useState('')
  const [funnelViewport, setFunnelViewport] = useState<Viewport>('desktop')
  const [lmViewport, setLmViewport] = useState<Viewport>('desktop')
  const [adViewport, setAdViewport] = useState<Viewport>('desktop')

  const loadFunnel = useCallback(async (funnelId: string, withFirstPage: boolean) => {
    // Cached — shared with the grid card hero, so preview ⇄ full-view
    // transitions don't re-download the funnel HTML.
    const funnel = await fetchFunnelWithPagesCached(funnelId)
    setSelectedFunnel(toSelectedFunnel(funnel, activeThemeIdRef.current))
    const pages = sortPages(funnel.pages ?? [])
    setFunnelPages(pages)
    if (withFirstPage && pages[0]) {
      setCurrentPageId(pages[0].id)
      setPageLoading(true)
      try {
        const loaded = await loadFunnelPagePreview(funnel.id, pages[0].id)
        if ('error' in loaded) {
          setPageError(loaded.error)
        } else {
          setPageContent(loaded)
        }
      } catch (err) {
        setPageError(err instanceof Error ? err.message : 'Failed to load page')
      } finally {
        setPageLoading(false)
      }
    } else {
      setCurrentPageId(null)
    }
  }, [])

  useEffect(() => {
    activeThemeIdRef.current = activeThemeId
    setSelectedFunnel((prev) =>
      prev ? { ...prev, themeId: activeThemeId ?? prev.funnelThemeId ?? null } : prev,
    )
  }, [activeThemeId])

  useEffect(() => {
    let cancelled = false
    setSelectedResource(selectionToResource(selection))
    setSelectedFunnel(null)
    setSelectedPresentation(null)
    setFunnelPages([])
    setCurrentPageId(null)
    setPageContent(null)
    setPageError(null)
    setPageLoading(false)
    setActiveThemeId(null)
    setThemePreviewCss('')

    if (selection.type === 'funnel' || selection.type === 'website') {
      const withFirstPage = selection.type === 'funnel'
      void loadFunnel(selection.id, withFirstPage).catch((err) => {
        if (cancelled) return
        console.error('[space-artifact-preview] funnel load failed:', err)
      })
    } else if (selection.type === 'presentation') {
      void (async () => {
        try {
          const pres = await fetchPresentationCached(selection.id)
          if (cancelled) return
          setSelectedPresentation(toSelectedPresentation(pres))
        } catch (err) {
          if (cancelled) return
          console.error('[space-artifact-preview] presentation load failed:', err)
        }
      })()
    }

    if (
      selection.type === 'funnel' ||
      selection.type === 'website' ||
      selection.type === 'presentation'
    ) {
      void fetchCampaignThemePreview(campaignId)
        .then(({ themeId, css }) => {
          if (cancelled) return
          setActiveThemeId(themeId)
          setThemePreviewCss(css)
        })
        .catch(() => {
          if (!cancelled) {
            setActiveThemeId(null)
            setThemePreviewCss('')
          }
        })
    }

    return () => {
      cancelled = true
    }
  }, [campaignId, selection.id, selection.type, loadFunnel])

  useEffect(() => {
    const handler = () => {
      invalidateCachedFetch(`campaign:${campaignId}`)
      void fetchCampaignThemePreview(campaignId)
        .then(({ themeId, css }) => {
          setActiveThemeId(themeId)
          setThemePreviewCss(css)
        })
        .catch(() => {
          setActiveThemeId(null)
          setThemePreviewCss('')
        })
    }
    window.addEventListener('campaign-config-updated', handler)
    return () => window.removeEventListener('campaign-config-updated', handler)
  }, [campaignId])

  useSpaceArtifactPreviewRealtime({
    selection,
    currentPageId,
    selectedFunnelId: selectedFunnel?.id,
    loadFunnel,
    setPageContent,
    setPageError,
    setSelectedPresentation,
  })

  const handleFunnelStatusChange = useCallback(
    (newStatus: string, newSlug: string, newPublishedUrl?: string) => {
      setSelectedFunnel((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              slug: newSlug,
              publishedUrl: newPublishedUrl ?? prev.publishedUrl,
            }
          : prev,
      )
    },
    [],
  )

  const handlePresentationStatusChange = useCallback(
    (newStatus: 'draft' | 'generated' | 'published', newPublishedUrl: string | null) => {
      setSelectedPresentation((prev) =>
        prev ? { ...prev, status: newStatus, publishedUrl: newPublishedUrl } : prev,
      )
    },
    [],
  )

  const refreshPresentation = useCallback(async () => {
    if (selection.type !== 'presentation') return
    try {
      invalidatePresentationPreviewCache(selection.id)
      const pres = await fetchPresentationCached(selection.id)
      setSelectedPresentation(toSelectedPresentation(pres))
    } catch {
      /* ignore */
    }
  }, [selection.id, selection.type])

  const handleAdUpdated = useCallback((updatedAd: Ad) => {
    setSelectedResource((prev) =>
      prev?.type === 'ad' && prev.id === updatedAd.id
        ? { ...prev, name: updatedAd.headline?.trim() || 'Untitled Ad' }
        : prev,
    )
  }, [])

  const handleFunnelPageChange = useCallback(
    async (pageId: string) => {
      if (!selectedFunnel?.id) return
      setCurrentPageId(pageId)
      const keepPreviewMounted = pageContent !== null
      if (!keepPreviewMounted) {
        setPageContent(null)
        setPageError(null)
        setPageLoading(true)
      }
      try {
        const loaded = await loadFunnelPagePreview(selectedFunnel.id, pageId)
        if ('error' in loaded) {
          setPageError(loaded.error)
          return
        }
        setPageContent(loaded)
      } catch (err) {
        setPageError(err instanceof Error ? err.message : 'Failed to load page')
      } finally {
        if (!keepPreviewMounted) setPageLoading(false)
      }
    },
    [pageContent, selectedFunnel?.id],
  )

  return {
    selectedResource,
    selectedFunnel,
    selectedPresentation,
    funnelPages,
    currentPageId,
    pageContent,
    pageLoading,
    pageError,
    themePreviewCss,
    funnelViewport,
    setFunnelViewport,
    lmViewport,
    setLmViewport,
    adViewport,
    setAdViewport,
    handleFunnelStatusChange,
    handlePresentationStatusChange,
    refreshPresentation,
    handleAdUpdated,
    handleFunnelPageChange,
  }
}
