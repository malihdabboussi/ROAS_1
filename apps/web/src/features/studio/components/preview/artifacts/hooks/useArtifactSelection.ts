'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchPresentation, type Ad } from '@/lib/artifacts'
import type { ArtifactPreviewResource as SelectedResource } from '@/lib/artifacts/artifact-preview-types'
import type { ArtifactsState } from '../tree/types'
import { useArtifactFunnelPagePreview } from './useArtifactFunnelPagePreview'
import {
  toSelectedFunnel,
  toSelectedPresentation,
  type SelectedFunnel,
  type SelectedPresentation,
} from './useArtifactSelection.helpers'
import { useArtifactNodeSelection } from './useArtifactNodeSelection'

interface UseArtifactSelectionParams {
  artifactsRef: React.MutableRefObject<ArtifactsState>
  setArtifacts: React.Dispatch<React.SetStateAction<ArtifactsState>>
  activeThemeId: string | null
}

export function useArtifactSelection({
  artifactsRef,
  setArtifacts,
  activeThemeId,
}: UseArtifactSelectionParams) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedResource, setSelectedResource] = useState<SelectedResource | null>(null)
  const [selectedFunnel, setSelectedFunnel] = useState<SelectedFunnel | null>(null)
  const [selectedPresentation, setSelectedPresentation] = useState<SelectedPresentation | null>(
    null,
  )
  const {
    pageContent,
    pageLoading,
    pageError,
    currentPageId,
    setCurrentPageId,
    resetPagePreview,
    loadFunnelPagePreview,
    handleFunnelPageChange,
    refreshCurrentFunnelPage,
  } = useArtifactFunnelPagePreview({
    selectedResource,
    selectedFunnelId: selectedFunnel?.id,
  })

  const { handleSelect, selectBlogPostById } = useArtifactNodeSelection({
    artifactsRef,
    activeThemeId,
    setSelectedId,
    setSelectedResource,
    setSelectedFunnel,
    setSelectedPresentation,
    resetPagePreview,
    setCurrentPageId,
    loadFunnelPagePreview,
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
              funnelType: prev.funnelType,
              layout: prev.layout ?? null,
            }
          : prev,
      )
      setArtifacts((prev) => ({
        ...prev,
        funnels: prev.funnels.map((f) =>
          f.id === selectedFunnel?.id
            ? {
                ...f,
                status: newStatus,
                slug: newSlug,
                published_url: newPublishedUrl ?? f.published_url,
              }
            : f,
        ),
      }))
    },
    [selectedFunnel?.id, setArtifacts],
  )

  const handlePresentationStatusChange = useCallback(
    (newStatus: 'draft' | 'generated' | 'published', newPublishedUrl: string | null) => {
      setSelectedPresentation((prev) =>
        prev ? { ...prev, status: newStatus, publishedUrl: newPublishedUrl } : prev,
      )
      setArtifacts((prev) => ({
        ...prev,
        presentations: prev.presentations.map((p) =>
          p.id === selectedPresentation?.id
            ? { ...p, status: newStatus, published_url: newPublishedUrl }
            : p,
        ),
      }))
    },
    [selectedPresentation?.id, setArtifacts],
  )

  const refreshSelectedPresentation = useCallback(async () => {
    const id = selectedPresentation?.id
    if (!id) return
    try {
      const pres = await fetchPresentation(id)
      setSelectedPresentation(toSelectedPresentation(pres))
      setArtifacts((prev) => ({
        ...prev,
        presentations: prev.presentations.map((p) =>
          p.id === id
            ? {
                ...p,
                name: pres.name,
                status: pres.status,
                file_url: pres.file_url,
                generated_html: pres.generated_html,
                published_url: pres.published_url,
                campaign_id: pres.campaign_id,
              }
            : p,
        ),
      }))
    } catch {
      /* ignore */
    }
  }, [selectedPresentation?.id, setArtifacts])

  const handleAdUpdated = useCallback(
    (updatedAd: Ad) => {
      setArtifacts((prev) => ({
        ...prev,
        ads: prev.ads.map((a) => (a.id === updatedAd.id ? updatedAd : a)),
      }))
    },
    [setArtifacts],
  )

  useEffect(() => {
    setSelectedFunnel((prev) => {
      if (!prev) return prev
      const funnel = artifactsRef.current.funnels.find((f) => f.id === prev.id)
      if (funnel) return toSelectedFunnel(funnel, activeThemeId)
      return {
        ...prev,
        themeId: activeThemeId ?? prev.themeId ?? null,
      }
    })
  }, [activeThemeId, artifactsRef])

  return {
    selectedId,
    setSelectedId,
    selectedResource,
    setSelectedResource,
    selectedFunnel,
    selectedPresentation,
    pageContent,
    pageLoading,
    pageError,
    currentPageId,
    handleSelect,
    selectBlogPostById,
    handleFunnelStatusChange,
    handlePresentationStatusChange,
    refreshSelectedPresentation,
    refreshCurrentFunnelPage,
    handleAdUpdated,
    handleFunnelPageChange,
  }
}
