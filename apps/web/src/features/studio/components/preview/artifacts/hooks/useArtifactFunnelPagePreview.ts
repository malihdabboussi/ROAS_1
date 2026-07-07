'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchFunnelPage,
  fetchFunnelPageBundle,
  type ArtifactPreviewResource,
} from '@/lib/artifacts'
import type { FunnelPagePreviewContent } from './useArtifactSelection.helpers'

interface UseArtifactFunnelPagePreviewParams {
  selectedResource: ArtifactPreviewResource | null
  selectedFunnelId: string | null | undefined
}

interface LoadPagePreviewOptions {
  updateCurrentPageId?: boolean
  keepPreviewMounted?: boolean
}

async function fetchPagePreviewContent(
  funnelId: string,
  pageId: string,
): Promise<{ content: FunnelPagePreviewContent | null; error: string | null }> {
  const page = await fetchFunnelPage(funnelId, pageId)
  if (page.source_mode === 'html_bundle') {
    const bundle = await fetchFunnelPageBundle(funnelId, pageId)
    return {
      content: { code: '', css: '', name: page.name, bundle },
      error: null,
    }
  }

  const content = page.generated_html ?? ''
  if (!content) {
    return {
      content: null,
      error: 'Page has no generated content yet',
    }
  }

  return {
    content: {
      code: content,
      css: page.generated_css ?? '',
      name: page.name,
      contract: page.preview_contract ?? undefined,
    },
    error: null,
  }
}

export function useArtifactFunnelPagePreview({
  selectedResource,
  selectedFunnelId,
}: UseArtifactFunnelPagePreviewParams) {
  const [pageContent, setPageContent] = useState<FunnelPagePreviewContent | null>(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [currentPageId, setCurrentPageId] = useState<string | null>(null)
  const funnelPageRealtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetPagePreview = useCallback(() => {
    setPageContent(null)
    setPageError(null)
  }, [])

  const loadFunnelPagePreview = useCallback(
    async (
      funnelId: string,
      pageId: string,
      {
        updateCurrentPageId = true,
        keepPreviewMounted = pageContent !== null,
      }: LoadPagePreviewOptions = {},
    ) => {
      if (updateCurrentPageId) setCurrentPageId(pageId)
      if (!keepPreviewMounted) {
        setPageContent(null)
        setPageError(null)
        setPageLoading(true)
      }

      try {
        const { content, error } = await fetchPagePreviewContent(funnelId, pageId)
        if (error) {
          setPageError(error)
          return
        }
        setPageContent(content)
        setPageError(null)
      } catch (err) {
        console.error('Failed to load page:', err)
        setPageError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_PAGE)
      } finally {
        if (!keepPreviewMounted) setPageLoading(false)
      }
    },
    [pageContent],
  )

  const handleFunnelPageChange = useCallback(
    async (pageId: string) => {
      if (!selectedFunnelId) return
      await loadFunnelPagePreview(selectedFunnelId, pageId)
    },
    [loadFunnelPagePreview, selectedFunnelId],
  )

  const refreshCurrentFunnelPage = useCallback(async () => {
    if (!currentPageId) return
    await handleFunnelPageChange(currentPageId)
  }, [currentPageId, handleFunnelPageChange])

  const funnelPageRealtimeTarget = useMemo(() => {
    if (selectedResource?.type === 'page' && selectedResource.funnelId && selectedResource.pageId) {
      return { funnelId: selectedResource.funnelId, pageId: selectedResource.pageId }
    }
    if (selectedFunnelId && currentPageId) {
      return { funnelId: selectedFunnelId, pageId: currentPageId }
    }
    return null
  }, [selectedResource, selectedFunnelId, currentPageId])

  useEffect(() => {
    if (!funnelPageRealtimeTarget) return
    const { funnelId, pageId } = funnelPageRealtimeTarget
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    let cancelled = false
    const refresh = () => {
      if (funnelPageRealtimeDebounceRef.current) clearTimeout(funnelPageRealtimeDebounceRef.current)
      funnelPageRealtimeDebounceRef.current = setTimeout(() => {
        void fetchPagePreviewContent(funnelId, pageId)
          .then(({ content, error }) => {
            if (cancelled) return
            if (error) {
              setPageError(error)
              return
            }
            setPageContent(content)
            setPageError(null)
          })
          .catch((err) => {
            console.error('Failed to load page:', err)
            if (!cancelled)
              setPageError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_PAGE)
          })
      }, 400)
    }
    const channel = supabase
      .channel(`funnel-page-preview:${pageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'funnel_pages',
          filter: `id=eq.${pageId}`,
        },
        refresh,
      )
      .subscribe()
    return () => {
      cancelled = true
      if (funnelPageRealtimeDebounceRef.current) clearTimeout(funnelPageRealtimeDebounceRef.current)
      void supabase.removeChannel(channel)
    }
  }, [funnelPageRealtimeTarget])

  return {
    pageContent,
    pageLoading,
    pageError,
    currentPageId,
    setCurrentPageId,
    resetPagePreview,
    loadFunnelPagePreview,
    handleFunnelPageChange,
    refreshCurrentFunnelPage,
  }
}
