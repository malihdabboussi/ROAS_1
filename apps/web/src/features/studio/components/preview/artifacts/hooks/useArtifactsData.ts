'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchBlogPosts,
  fetchCampaignAdCampaigns,
  fetchCampaignAds,
  fetchCampaignAvatars,
  fetchCampaignFunnels,
  fetchCampaignOffers,
  fetchCampaignPresentations,
  fetchCampaignSequences,
  fetchCampaignSocialPosts,
} from '@/features/studio/services/artifact-preview.service'
import { fetchCampaigns } from '@/lib/campaigns'
import { buildArtifactTree } from '../tree/buildArtifactTree'
import { ARTIFACT_CATEGORIES, EMPTY_ARTIFACTS, normalizeArtifactsState } from '../tree/constants'
import type { ArtifactCategoryId, ArtifactsState } from '../tree/types'
import {
  buildExpandedArtifactIds,
  collectExpandableNodeIds,
  countTopLevelChildren,
  filterTreeDataBySource,
  findNewestArtifactNode,
  getArtifactsCacheKey,
  getInitialExpandedArtifactIds,
  mapCampaignOptions,
} from './useArtifactsData.helpers'
import { useArtifactsRealtime } from './useArtifactsRealtime'
import { useArtifactsThemePreview } from './useArtifactsThemePreview'

interface UseArtifactsDataParams {
  campaignId: string
}

interface ArtifactsCachePayload {
  artifacts: ArtifactsState
}

export function useArtifactsData({ campaignId }: UseArtifactsDataParams) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(getInitialExpandedArtifactIds)
  const [artifacts, setArtifacts] = useState<ArtifactsState>(EMPTY_ARTIFACTS)
  const artifactsRef = useRef<ArtifactsState>(EMPTY_ARTIFACTS)
  const [treeData, setTreeData] = useState(buildArtifactTree([], [], [], [], [], [], [], [], []))
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const { activeThemeId, themePreviewCss } = useArtifactsThemePreview(campaignId)
  const [campaignOptions, setCampaignOptions] = useState<
    Array<{ id: string; name: string; icon: string }>
  >([])
  const [filterSet, setFilterSet] = useState<Set<ArtifactCategoryId> | null>(null)
  const [sourceFilter, setSourceFilter] = useState<'all' | 'vibey' | 'meta'>('all')
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const loadGenRef = useRef(0)

  useEffect(() => {
    fetchCampaigns()
      .then((data) => setCampaignOptions(mapCampaignOptions(data)))
      .catch(() => setCampaignOptions([]))
  }, [])

  useEffect(() => {
    const normalized = normalizeArtifactsState(artifacts)
    artifactsRef.current = normalized
    setTreeData(
      buildArtifactTree(
        normalized.funnels,
        normalized.offers,
        normalized.ads,
        normalized.sequences,
        normalized.presentations,
        normalized.avatars,
        normalized.adCampaigns,
        normalized.socialPosts,
        normalized.blogPosts,
      ),
    )
  }, [artifacts])

  const loadArtifacts = useCallback(
    async (silent?: boolean): Promise<ArtifactsState | null> => {
      if (!campaignId) return null
      const gen = ++loadGenRef.current
      if (!silent) {
        setLoading(true)
        setFetchError(null)
      }

      try {
        const [funnels, offers, ads, sequences, presentations, avatars, adCampaigns, socialPosts] =
          await Promise.all([
            fetchCampaignFunnels(campaignId),
            fetchCampaignOffers(campaignId),
            fetchCampaignAds(campaignId),
            fetchCampaignSequences(campaignId),
            fetchCampaignPresentations(campaignId),
            fetchCampaignAvatars(campaignId),
            fetchCampaignAdCampaigns(campaignId),
            fetchCampaignSocialPosts(campaignId),
          ])
        if (gen !== loadGenRef.current) return null
        const websiteFunnels = funnels.filter((f) => f.funnel_type === 'website')
        const blogPostsNested = await Promise.all(
          websiteFunnels.map((funnel) => fetchBlogPosts(funnel.id).catch(() => [])),
        )
        if (gen !== loadGenRef.current) return null
        const blogPosts = blogPostsNested.flat()
        const nextArtifacts: ArtifactsState = {
          funnels,
          offers,
          ads,
          sequences,
          presentations,
          avatars,
          adCampaigns,
          socialPosts,
          blogPosts,
        }
        setArtifacts(nextArtifacts)
        artifactsRef.current = nextArtifacts
        try {
          const cachePayload: ArtifactsCachePayload = { artifacts: nextArtifacts }
          sessionStorage.setItem(getArtifactsCacheKey(campaignId), JSON.stringify(cachePayload))
        } catch {
          /* empty */
        }

        if (silent) {
          setExpandedIds((prev) => buildExpandedArtifactIds(nextArtifacts, prev))
        } else {
          setExpandedIds(buildExpandedArtifactIds(nextArtifacts))
        }

        return nextArtifacts
      } catch (err) {
        if (gen !== loadGenRef.current) return null
        console.error('Failed to load artifacts:', err)
        if (!silent) {
          setFetchError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_ARTIFACTS)
          setArtifacts(EMPTY_ARTIFACTS)
          artifactsRef.current = EMPTY_ARTIFACTS
        }
        return null
      } finally {
        if (gen === loadGenRef.current) setLoading(false)
      }
    },
    [campaignId],
  )

  useEffect(() => {
    if (!campaignId) return

    let hydratedFromCache = false
    try {
      const raw = sessionStorage.getItem(getArtifactsCacheKey(campaignId))
      if (raw) {
        const cache = JSON.parse(raw) as ArtifactsCachePayload
        if (cache?.artifacts) {
          hydratedFromCache = true
          const normalized = normalizeArtifactsState(cache.artifacts)
          setArtifacts(normalized)
          artifactsRef.current = normalized
          setFetchError(null)
          setLoading(false)
        }
      }
    } catch {
      /* empty */
    }

    if (hydratedFromCache) {
      void loadArtifacts(true)
    } else {
      void loadArtifacts()
    }
  }, [campaignId, loadArtifacts])

  useArtifactsRealtime({ campaignId, loadArtifacts })

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandableNodeIds = useMemo(() => {
    return collectExpandableNodeIds(treeData)
  }, [treeData])

  const isAllExpanded =
    expandableNodeIds.length > 0 && expandableNodeIds.every((id) => expandedIds.has(id))

  const handleToggleExpandAll = useCallback(() => {
    setExpandedIds((prev) => {
      const currentlyAllExpanded =
        expandableNodeIds.length > 0 && expandableNodeIds.every((id) => prev.has(id))
      return currentlyAllExpanded ? new Set<string>() : new Set(expandableNodeIds)
    })
  }, [expandableNodeIds])

  const isFiltering = filterSet !== null || sourceFilter !== 'all'
  const filteredTreeData = useMemo(() => {
    return filterTreeDataBySource(treeData, filterSet, sourceFilter)
  }, [treeData, filterSet, sourceFilter])

  const totalItems = countTopLevelChildren(treeData)
  const filteredTotalItems = countTopLevelChildren(filteredTreeData)

  return {
    artifacts,
    setArtifacts,
    artifactsRef,
    treeData,
    loading,
    fetchError,
    expandedIds,
    setExpandedIds,
    activeThemeId,
    themePreviewCss,
    campaignOptions,
    loadArtifacts,
    toggleExpand,
    isAllExpanded,
    handleToggleExpandAll,
    filterSet,
    setFilterSet,
    sourceFilter,
    setSourceFilter,
    filterDropdownOpen,
    setFilterDropdownOpen,
    filterBtnRef,
    isFiltering,
    filteredTreeData,
    totalItems,
    filteredTotalItems,
    findNewestArtifactNode,
    artifactCategories: ARTIFACT_CATEGORIES,
  }
}
