import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { backendGet } from '@/lib/api/backend-client'
import { getAtTokenAtCursor } from '../../utils/textarea-caret-viewport'
import type { AtMentionItem } from './chat-input-at-mentions'

type ChatInputAtMentionFetch = (path: string) => Promise<unknown>

const defaultAtMentionFetch: ChatInputAtMentionFetch = (path) => backendGet<unknown>(path)

export interface UseChatInputAtMentionDataOptions {
  campaignId?: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  spaceTaskMentions: readonly AtMentionItem[]
  fetchJson?: ChatInputAtMentionFetch
  onActiveTokenSync?: () => void
}

export function useChatInputAtMentionData({
  campaignId,
  textareaRef,
  spaceTaskMentions,
  fetchJson = defaultAtMentionFetch,
  onActiveTokenSync,
}: UseChatInputAtMentionDataOptions) {
  const [atMenuOpen, setAtMenuOpen] = useState(false)
  const [atItems, setAtItems] = useState<AtMentionItem[]>([])
  const [atQuery, setAtQuery] = useState('')
  const [atDataLoading, setAtDataLoading] = useState(false)
  const [otherCampaigns, setOtherCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [crossCampaignMode, setCrossCampaignMode] = useState(false)
  const [crossCampaignId, setCrossCampaignId] = useState<string | null>(null)
  const [crossCampaignItems, setCrossCampaignItems] = useState<AtMentionItem[]>([])
  const [crossCampaignLoading, setCrossCampaignLoading] = useState(false)

  const allAtItemsRef = useRef<AtMentionItem[]>([])
  const atLoadedCampaignIdRef = useRef<string | null>(null)
  const atLoadingRef = useRef(false)
  const otherCampaignsLoadedRef = useRef(false)
  const crossCampaignItemsRef = useRef<AtMentionItem[]>([])
  const crossCampaignModeRef = useRef(false)
  const spaceTaskMentionsRef = useRef(spaceTaskMentions)

  crossCampaignItemsRef.current = crossCampaignItems
  crossCampaignModeRef.current = crossCampaignMode
  spaceTaskMentionsRef.current = spaceTaskMentions

  const loadAtMentionData = useCallback(
    async (currentCampaignId: string) => {
      if (atLoadingRef.current) return
      atLoadingRef.current = true
      setAtDataLoading(true)
      try {
        const items: AtMentionItem[] = []
        const [
          offersRes,
          funnelsRes,
          sequencesRes,
          presentationsRes,
          avatarsRes,
          mediaRes,
          missionRes,
        ] = await Promise.allSettled([
          fetchJson(`/api/campaigns/${currentCampaignId}/offers`),
          fetchJson(`/api/funnels?campaign_id=${currentCampaignId}`),
          fetchJson(`/api/campaigns/${currentCampaignId}/sequences`),
          fetchJson(`/api/campaigns/${currentCampaignId}/presentations`),
          fetchJson(`/api/campaigns/${currentCampaignId}/avatars`),
          fetchJson(`/api/media/assets?campaign_id=${currentCampaignId}&limit=50`),
          fetchJson(`/api/missions?campaign_id=${currentCampaignId}&limit=30`),
        ])
        pushNamedArtifacts(items, offersRes, 'offer')
        pushNamedArtifacts(items, funnelsRes, 'funnel')
        pushNamedArtifacts(items, sequencesRes, 'sequence')
        pushNamedArtifacts(items, presentationsRes, 'presentation')
        pushNamedArtifacts(items, avatarsRes, 'avatar')
        pushMediaItems(items, mediaRes)
        pushMissionItems(items, missionRes)
        allAtItemsRef.current = items
        atLoadedCampaignIdRef.current = currentCampaignId
      } catch {
        allAtItemsRef.current = []
      } finally {
        atLoadingRef.current = false
        setAtDataLoading(false)
      }
    },
    [fetchJson],
  )

  const loadOtherCampaigns = useCallback(
    async (currentCampaignId: string | undefined) => {
      if (otherCampaignsLoadedRef.current) return
      otherCampaignsLoadedRef.current = true
      try {
        const data = asCampaignRows(await fetchJson('/api/campaigns'))
        const others = data
          .filter((campaign) => campaign.id !== currentCampaignId)
          .map((campaign) => ({ id: campaign.id, name: campaign.name ?? 'Untitled' }))
        setOtherCampaigns((prev) => (sameCampaignRows(prev, others) ? prev : others))
      } catch {
        setOtherCampaigns((prev) => (prev.length === 0 ? prev : []))
      }
    },
    [fetchJson],
  )

  useEffect(() => {
    allAtItemsRef.current = []
    atLoadedCampaignIdRef.current = null
    atLoadingRef.current = false
    otherCampaignsLoadedRef.current = false
    setOtherCampaigns((prev) => (prev.length === 0 ? prev : []))
  }, [campaignId])

  const syncAtMenuFromComposer = useCallback(
    (text: string, cursor: number) => {
      const token = getAtTokenAtCursor(text, cursor)
      if (token) {
        const query = token.query.toLowerCase()
        const normalizedQuery = query.replace(/_/g, ' ')
        setAtQuery((prev) => (prev === query ? prev : query))
        onActiveTokenSync?.()
        const source = crossCampaignModeRef.current
          ? crossCampaignItemsRef.current
          : [...allAtItemsRef.current, ...spaceTaskMentionsRef.current]
        const filtered = source.filter(
          (item) =>
            item.label.toLowerCase().includes(normalizedQuery) ||
            (item.type?.toLowerCase().includes(normalizedQuery) ?? false),
        )
        setAtItems((prev) => (sameAtMentionItems(prev, filtered) ? prev : filtered))
        setAtMenuOpen(true)
        return
      }

      setAtMenuOpen(false)
      setAtQuery('')
      setCrossCampaignMode(false)
      setCrossCampaignId(null)
    },
    [onActiveTokenSync],
  )

  useEffect(() => {
    if (!atMenuOpen) return
    if (campaignId && atLoadedCampaignIdRef.current !== campaignId) {
      void loadAtMentionData(campaignId)
    }
    void loadOtherCampaigns(campaignId)
  }, [atMenuOpen, campaignId, loadAtMentionData, loadOtherCampaigns])

  useEffect(() => {
    if (atDataLoading || !atMenuOpen) return
    const textarea = textareaRef.current
    if (!textarea) return
    syncAtMenuFromComposer(textarea.value, textarea.selectionStart)
  }, [atDataLoading, atMenuOpen, syncAtMenuFromComposer, textareaRef])

  useEffect(() => {
    if (!crossCampaignId) {
      setCrossCampaignItems((prev) => (prev.length === 0 ? prev : []))
      return
    }
    setCrossCampaignLoading(true)
    const load = async () => {
      const items: AtMentionItem[] = []
      const [offersRes, funnelsRes, sequencesRes, mediaRes, missionRes] =
        await Promise.allSettled([
          fetchJson(`/api/campaigns/${crossCampaignId}/offers`),
          fetchJson(`/api/funnels?campaign_id=${crossCampaignId}`),
          fetchJson(`/api/campaigns/${crossCampaignId}/sequences`),
          fetchJson(`/api/media/assets?campaign_id=${crossCampaignId}&limit=30`),
          fetchJson(`/api/missions?campaign_id=${crossCampaignId}&limit=20`),
        ])
      pushNamedArtifacts(items, offersRes, 'offer')
      pushNamedArtifacts(items, funnelsRes, 'funnel')
      pushNamedArtifacts(items, sequencesRes, 'sequence')
      pushMediaItems(items, mediaRes)
      pushMissionItems(items, missionRes)
      setCrossCampaignItems((prev) => (sameAtMentionItems(prev, items) ? prev : items))
      setAtItems((prev) => (sameAtMentionItems(prev, items) ? prev : items))
      setCrossCampaignLoading(false)
    }
    load().catch(() => {
      setCrossCampaignItems((prev) => (prev.length === 0 ? prev : []))
      setAtItems((prev) => (prev.length === 0 ? prev : []))
      setCrossCampaignLoading(false)
    })
  }, [crossCampaignId, fetchJson])

  return {
    atMenuOpen,
    setAtMenuOpen,
    atItems,
    setAtItems,
    atQuery,
    setAtQuery,
    atDataLoading,
    otherCampaigns,
    crossCampaignMode,
    setCrossCampaignMode,
    crossCampaignId,
    setCrossCampaignId,
    crossCampaignItems,
    crossCampaignLoading,
    syncAtMenuFromComposer,
  }
}

function pushNamedArtifacts(
  items: AtMentionItem[],
  result: PromiseSettledResult<unknown>,
  type: string,
) {
  if (result.status !== 'fulfilled') return
  for (const row of asNamedRows(result.value)) {
    items.push({
      id: row.id,
      label: row.name ?? `Untitled ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      section: 'artifact',
      type,
    })
  }
}

function pushMediaItems(items: AtMentionItem[], result: PromiseSettledResult<unknown>) {
  if (result.status !== 'fulfilled') return
  for (const media of asMediaAssets(result.value)) {
    items.push({
      id: media.id,
      label: media.name,
      section: 'media',
      type: media.mime_type,
      thumbnailUrl: media.public_url ?? undefined,
    })
  }
}

function pushMissionItems(items: AtMentionItem[], result: PromiseSettledResult<unknown>) {
  if (result.status !== 'fulfilled') return
  for (const mission of asMissionRows(result.value)) {
    items.push({
      id: mission.id,
      label: mission.title ?? 'Untitled Mission',
      section: 'mission',
      type: mission.status,
    })
  }
}

function asNamedRows(value: unknown): Array<{ id: string; name: string | null }> {
  return Array.isArray(value) ? (value as Array<{ id: string; name: string | null }>) : []
}

function asMediaAssets(value: unknown): Array<{
  id: string
  name: string
  mime_type?: string
  public_url?: string | null
}> {
  if (!value || typeof value !== 'object') return []
  const assets = (value as { assets?: unknown }).assets
  return Array.isArray(assets)
    ? (assets as Array<{
        id: string
        name: string
        mime_type?: string
        public_url?: string | null
      }>)
    : []
}

function asMissionRows(value: unknown): Array<{ id: string; title: string; status?: string }> {
  return Array.isArray(value) ? (value as Array<{ id: string; title: string; status?: string }>) : []
}

function asCampaignRows(value: unknown): Array<{ id: string; name: string | null }> {
  return Array.isArray(value) ? (value as Array<{ id: string; name: string | null }>) : []
}

function sameAtMentionItems(a: AtMentionItem[], b: AtMentionItem[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => {
    const next = b[index]
    return (
      item.id === next?.id &&
      item.label === next.label &&
      item.section === next.section &&
      item.type === next.type &&
      item.thumbnailUrl === next.thumbnailUrl
    )
  })
}

function sameCampaignRows(
  a: Array<{ id: string; name: string }>,
  b: Array<{ id: string; name: string }>,
): boolean {
  if (a.length !== b.length) return false
  return a.every((campaign, index) => {
    const next = b[index]
    return campaign.id === next?.id && campaign.name === next.name
  })
}
