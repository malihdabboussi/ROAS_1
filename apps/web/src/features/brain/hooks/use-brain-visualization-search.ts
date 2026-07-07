'use client'

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { searchCampaignKnowledge } from '@/lib/campaigns'
import { campaignKnowledgeNodeToBrainMemory } from '../lib/brain-campaign-scope-graph'
import { fetchBrainImageSearch, fetchBrainSearch } from '../services/brain.service'
import type { BrainGraphData, BrainMemory } from '../types'

type BrainVisualizationSearchScope = {
  agentId?: string | null
  brainId?: string | null
}

interface UseBrainVisualizationSearchOptions {
  activeCampaignId?: string | null
  isCampaignScope: boolean
  isKnowledgeScope: boolean
  searchGraphData: BrainGraphData | null
  selectedScope?: BrainVisualizationSearchScope | null
  onSelectMemory: (memory: BrainMemory) => void
}

export function useBrainVisualizationSearch({
  activeCampaignId,
  isCampaignScope,
  isKnowledgeScope,
  searchGraphData,
  selectedScope,
  onSelectMemory,
}: UseBrainVisualizationSearchOptions) {
  const [searchDockOpen, setSearchDockOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState<BrainMemory[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchImageInputRef = useRef<HTMLInputElement>(null)
  const searchAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const panelOpen = searchLoading || searchResults.length > 0 || searchInput.trim().length >= 2
    if (!panelOpen) return
    const onDocMouseDown = (event: MouseEvent) => {
      if (!searchAnchorRef.current?.contains(event.target as Node)) {
        setSearchResults([])
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        setSearchLoading(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [searchLoading, searchResults.length, searchInput])

  const handleSearchInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setSearchInput(value)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      if (value.trim().length < 2) {
        setSearchResults([])
        setSearchLoading(false)
        return
      }
      setSearchLoading(true)
      searchTimerRef.current = setTimeout(async () => {
        try {
          if (isCampaignScope && activeCampaignId) {
            const campaignResults = await searchCampaignKnowledge(activeCampaignId, value.trim())
            setSearchResults((campaignResults.nodes || []).map(campaignKnowledgeNodeToBrainMemory))
          } else if (isKnowledgeScope && searchGraphData) {
            const query = value.trim().toLowerCase()
            setSearchResults(
              searchGraphData.nodes
                .filter((node) =>
                  `${node.name ?? ''} ${node.content ?? ''} ${node.source_title ?? ''}`
                    .toLowerCase()
                    .includes(query),
                )
                .slice(0, 15),
            )
          } else {
            const results = await fetchBrainSearch(
              value.trim(),
              15,
              selectedScope?.brainId ?? undefined,
              selectedScope?.agentId ?? undefined,
            )
            setSearchResults(results)
          }
        } catch {
          setSearchResults([])
        } finally {
          setSearchLoading(false)
        }
      }, 300)
    },
    [
      activeCampaignId,
      isCampaignScope,
      isKnowledgeScope,
      searchGraphData,
      selectedScope?.agentId,
      selectedScope?.brainId,
    ],
  )

  const openSearchDock = useCallback(() => {
    setSearchDockOpen(true)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchInput('')
    setSearchResults([])
    setSearchLoading(false)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
  }, [])

  const handleSearchInputBlur = useCallback(() => {
    if (!searchInput.trim()) setSearchDockOpen(false)
  }, [searchInput])

  const handleSearchEscape = useCallback(() => {
    clearSearch()
    setSearchDockOpen(false)
  }, [clearSearch])

  const openImageSearch = useCallback(() => {
    searchImageInputRef.current?.click()
  }, [])

  const handleImageSearchFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      setSearchLoading(true)
      reader.onload = async () => {
        try {
          const result = String(reader.result ?? '')
          const [, base64 = ''] = result.split(',')
          const results = await fetchBrainImageSearch({
            base64,
            mimeType: file.type || 'image/png',
            caption: searchInput.trim() || undefined,
            limit: 15,
            brainId: selectedScope?.brainId ?? undefined,
            agentId: selectedScope?.agentId ?? undefined,
          })
          setSearchResults(results)
        } catch {
          setSearchResults([])
        } finally {
          setSearchLoading(false)
        }
      }
      reader.onerror = () => {
        setSearchLoading(false)
        setSearchResults([])
      }
      reader.readAsDataURL(file)
      event.target.value = ''
    },
    [searchInput, selectedScope?.agentId, selectedScope?.brainId],
  )

  const handleSelectSearchResult = useCallback(
    (memory: BrainMemory) => {
      onSelectMemory(memory)
    },
    [onSelectMemory],
  )

  return {
    searchAnchorRef,
    searchDockOpen,
    searchImageInputRef,
    searchInput,
    searchLoading,
    searchResults,
    clearSearch,
    handleImageSearchFileChange,
    handleSearchEscape,
    handleSearchInputBlur,
    handleSearchInputChange,
    handleSelectSearchResult,
    openImageSearch,
    openSearchDock,
  }
}
