'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCampaignMode } from '@/features/studio/contexts/CampaignModeContext'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { fetchFunnelWithPages, type FunnelPage } from '@/lib/artifacts'
import type { ArtifactPreviewResource as SelectedResource } from '@/lib/artifacts/artifact-preview-types'
import type { VibeyPendingArtifactOpenSimpleType } from '@/lib/artifacts/pending-artifact-open'
import { emitActiveArtifactSelection } from '@/lib/chat/use-active-artifact-selection-signal'
import type { TreeNode } from '../tree/types'
import { useArtifactMutations } from './useArtifactMutations'
import {
  buildActiveArtifactSelection,
  findNodeById,
  getAdSetOptions,
  normalizePendingArtifactOpen,
  pendingToSyntheticTreeNode,
  sortPages,
} from './useArtifactsController.helpers'
import { useArtifactsData } from './useArtifactsData'
import { useArtifactSelection } from './useArtifactSelection'

export function useArtifactsController(campaignId: string) {
  const router = useRouter()
  const { activeCampaignName, setBulkCreatorAdSetId, setActivePreviewTab, expandPanel } =
    useCampaignMode()
  const [funnelViewport, setFunnelViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [lmViewport, setLmViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [adViewport, setAdViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [fetchedFunnelPages, setFetchedFunnelPages] = useState<FunnelPage[]>([])
  const restoredRef = useRef(false)

  const data = useArtifactsData({ campaignId })
  const selection = useArtifactSelection({
    artifactsRef: data.artifactsRef,
    setArtifacts: data.setArtifacts,
    activeThemeId: data.activeThemeId,
  })
  const mutations = useArtifactMutations({
    campaignId,
    selectedId: selection.selectedId,
    setSelectedId: selection.setSelectedId,
    setSelectedResource: selection.setSelectedResource as React.Dispatch<
      React.SetStateAction<unknown>
    >,
    setArtifacts: data.setArtifacts,
    setExpandedIds: data.setExpandedIds,
    loadArtifacts: data.loadArtifacts,
  })

  useEffect(() => {
    if (!selection.selectedId) return
    const key = `vibey-artifact-selection:${campaignId}`
    sessionStorage.setItem(key, selection.selectedId)
  }, [selection.selectedId, campaignId])

  useEffect(() => {
    emitActiveArtifactSelection(
      buildActiveArtifactSelection(selection.selectedResource, selection.currentPageId, campaignId),
    )
  }, [campaignId, selection.currentPageId, selection.selectedResource])

  useEffect(() => {
    if (data.loading) return
    const raw = window.__vibey_pending_artifact_open
    const pending = normalizePendingArtifactOpen(raw)
    if (!pending) return
    delete window.__vibey_pending_artifact_open

    restoredRef.current = true
    selection.handleSelect(pendingToSyntheticTreeNode(pending))
  }, [data.loading])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        artifactType?: string
        artifactId?: string
        spaceId?: string
        name?: string
      } | null
      if (!detail?.artifactType || !detail?.artifactId) return
      if (detail.artifactType === 'visual-doc' && detail.spaceId) {
        router.push(`/spaces?space=${detail.spaceId}&item=${detail.artifactId}&doc_tab=visual`)
        return
      }
      expandPanel('artifacts')
      const type = (
        detail.artifactType === 'website' ? 'funnel' : detail.artifactType
      ) as VibeyPendingArtifactOpenSimpleType
      const node = pendingToSyntheticTreeNode({
        kind: 'simple',
        type,
        id: detail.artifactId,
        name: detail.name ?? 'Artifact',
      })
      void data.loadArtifacts(true).then(() => selection.handleSelect(node))
    }
    window.addEventListener('vibey-open-artifact', handler)
    return () => window.removeEventListener('vibey-open-artifact', handler)
  }, [data.loadArtifacts, selection.handleSelect, expandPanel, router])

  useEffect(() => {
    const key = `vibey-artifact-selection:${campaignId}`
    const savedId = sessionStorage.getItem(key)
    if (data.loading || restoredRef.current || selection.selectedId) return
    if (!savedId) return

    const node = findNodeById(data.treeData, savedId)
    if (!node && savedId.startsWith('blog-post-')) {
      const postId = savedId.slice('blog-post-'.length)
      if (data.artifacts.blogPosts.some((p) => p.id === postId)) {
        restoredRef.current = true
        selection.selectBlogPostById(postId)
        return
      }
    }
    if (node) {
      restoredRef.current = true
      void selection.handleSelect(node)
    } else {
      sessionStorage.removeItem(key)
    }
  }, [data.loading, data.treeData, data.artifacts.blogPosts, campaignId, selection])

  useEffect(() => {
    if (!selection.selectedFunnel) {
      setFetchedFunnelPages([])
      return
    }
    const funnel = data.artifacts.funnels.find((f) => f.id === selection.selectedFunnel!.id)
    const pages = funnel?.pages ?? []
    if (Array.isArray(pages) && pages.length > 0) {
      setFetchedFunnelPages([])
      return
    }
    fetchFunnelWithPages(selection.selectedFunnel.id)
      .then((f) => setFetchedFunnelPages(sortPages(f.pages ?? [])))
      .catch(() => setFetchedFunnelPages([]))
  }, [selection.selectedFunnel?.id, data.artifacts.funnels])

  const funnelPages: FunnelPage[] = useMemo(() => {
    if (!selection.selectedFunnel) return []
    const funnel = data.artifacts.funnels.find((f) => f.id === selection.selectedFunnel!.id)
    const pages = funnel?.pages ?? fetchedFunnelPages
    if (!pages || pages.length === 0) return fetchedFunnelPages
    return sortPages(pages)
  }, [data.artifacts.funnels, selection.selectedFunnel, fetchedFunnelPages])

  const adSetOptions = useMemo(() => {
    return getAdSetOptions(data.artifacts.adCampaigns)
  }, [data.artifacts.adCampaigns])

  const setPendingComposerText = useChatStore((s) => s.setPendingComposerText)

  const handleCreateVariations = useCallback(
    (node: TreeNode) => {
      const prompt =
        `I want to create ad variations based on my existing ad "${node.label}". ` +
        `Please analyze this ad's creative (headline, copy, CTA, imagery) and generate 3-5 distinct variations. ` +
        `For each variation, provide: headline, primary text, description, and CTA. ` +
        `Make them different angles but inspired by the original. ` +
        `After I pick my favorites, help me create them as new ads.`
      setPendingComposerText(prompt)
    },
    [setPendingComposerText],
  )

  const handleOpenBulkCreator = useCallback(
    (adSetId: string) => {
      setActivePreviewTab('artifacts')
      setBulkCreatorAdSetId(adSetId)
      selection.setSelectedId('ads')
      selection.setSelectedResource({
        type: 'category-settings',
        id: 'ads',
        section: 'ads',
        name: 'Ads Settings',
      } as SelectedResource)
    },
    [setActivePreviewTab, setBulkCreatorAdSetId, selection],
  )

  const handleBlogPostChange = useCallback(
    (postId: string) => {
      selection.selectBlogPostById(postId)
    },
    [selection],
  )

  return {
    activeCampaignName,
    campaignId,
    funnelViewport,
    setFunnelViewport,
    lmViewport,
    setLmViewport,
    adViewport,
    setAdViewport,
    funnelPages,
    adSetOptions,
    handleCreateVariations,
    handleOpenBulkCreator,
    handleBlogPostChange,
    ...data,
    ...selection,
    ...mutations,
  }
}
