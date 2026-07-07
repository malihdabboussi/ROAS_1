import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  fetchPresentationCached,
  invalidateFunnelPreviewCache,
  invalidatePresentationPreviewCache,
} from '@/lib/artifacts'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import {
  loadFunnelPagePreview,
  presentationBundleVersion,
  toSelectedPresentation,
  type PageContent,
  type SelectedPresentation,
} from './use-space-artifact-preview-controller.helpers'

interface UseSpaceArtifactPreviewRealtimeParams {
  selection: ArtifactPreviewSelection
  currentPageId: string | null
  selectedFunnelId: string | null | undefined
  loadFunnel: (funnelId: string, withFirstPage: boolean) => Promise<void>
  setPageContent: Dispatch<SetStateAction<PageContent | null>>
  setPageError: Dispatch<SetStateAction<string | null>>
  setSelectedPresentation: Dispatch<SetStateAction<SelectedPresentation | null>>
}

export function useSpaceArtifactPreviewRealtime({
  selection,
  currentPageId,
  selectedFunnelId,
  loadFunnel,
  setPageContent,
  setPageError,
  setSelectedPresentation,
}: UseSpaceArtifactPreviewRealtimeParams) {
  useEffect(() => {
    if (selection.type !== 'funnel' && selection.type !== 'website') return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const refresh = () => {
      // Realtime says the funnel changed — drop the cached copy before reloading.
      invalidateFunnelPreviewCache(selection.id)
      void loadFunnel(selection.id, selection.type === 'funnel' && currentPageId === null).catch(
        () => {},
      )
    }
    const channel = supabase
      .channel(`space-funnel-preview:${selection.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'funnels', filter: `id=eq.${selection.id}` },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'funnel_pages',
          filter: `funnel_id=eq.${selection.id}`,
        },
        refresh,
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentPageId, loadFunnel, selection.id, selection.type])

  useEffect(() => {
    if (selection.type !== 'presentation') return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    let cancelled = false
    const refresh = (forceReload: boolean) => {
      invalidatePresentationPreviewCache(selection.id)
      void fetchPresentationCached(selection.id)
        .then((pres) => {
          if (cancelled) return
          // Row events: version follows updated_at, so an unchanged row no
          // longer doubles the preview's presentation+bundle refetch.
          // File/asset events may not bump the row — force a reload then.
          setSelectedPresentation(
            toSelectedPresentation(
              pres,
              forceReload ? Date.now() : presentationBundleVersion(pres),
            ),
          )
        })
        .catch(() => {})
    }
    const channel = supabase
      .channel(`space-presentation-preview:${selection.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentations',
          filter: `id=eq.${selection.id}`,
        },
        () => refresh(false),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentation_files',
          filter: `presentation_id=eq.${selection.id}`,
        },
        () => refresh(true),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentation_assets',
          filter: `presentation_id=eq.${selection.id}`,
        },
        () => refresh(true),
      )
      .subscribe()
    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [selection.id, selection.type, setSelectedPresentation])

  useEffect(() => {
    if (!currentPageId || !selectedFunnelId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    let cancelled = false
    const refresh = () => {
      invalidateFunnelPreviewCache(selectedFunnelId)
      void loadFunnelPagePreview(selectedFunnelId, currentPageId)
        .then((loaded) => {
          if (cancelled) return
          if ('error' in loaded) {
            setPageError(loaded.error)
            return
          }
          setPageContent(loaded)
          setPageError(null)
        })
        .catch(() => {})
    }
    const channel = supabase
      .channel(`space-funnel-page-preview:${currentPageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'funnel_pages',
          filter: `id=eq.${currentPageId}`,
        },
        refresh,
      )
      .subscribe()
    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [currentPageId, selectedFunnelId, setPageContent, setPageError])
}
