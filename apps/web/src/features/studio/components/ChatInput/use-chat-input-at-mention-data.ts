import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { backendGet } from '@/lib/api/backend-client'
import { getAtTokenAtCursor } from '../../utils/textarea-caret-viewport'
import type { AtMentionItem } from './chat-input-at-mentions'
import {
  asCampaignRows,
  asEntitySearchResults,
  sortCampaignMentionRows,
  pushMediaItems,
  pushMissionItems,
  pushNamedArtifacts,
  sameAtMentionItems,
  sameCampaignRows,
} from './use-chat-input-at-mention-data.helpers'

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
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [otherCampaigns, setOtherCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [crossCampaignMode, setCrossCampaignMode] = useState(false)
  const [crossCampaignId, setCrossCampaignId] = useState<string | null>(null)
  const [crossCampaignItems, setCrossCampaignItems] = useState<AtMentionItem[]>([])
  const [crossCampaignLoading, setCrossCampaignLoading] = useState(false)

  const allAtItemsRef = useRef<AtMentionItem[]>([])
  const peopleItemsRef = useRef<AtMentionItem[]>([])
  const atLoadedCampaignIdRef = useRef<string | null>(null)
  const atLoadingRef = useRef(false)
  const otherCampaignsLoadedRef = useRef(false)
  const peopleLoadedRef = useRef(false)
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
        const others = sortCampaignMentionRows(
          asCampaignRows(await fetchJson('/api/campaigns')).filter(
            (campaign) => campaign.id !== currentCampaignId,
          ),
        ).map((campaign) => ({ id: campaign.id, name: campaign.name }))
        setOtherCampaigns((prev) => (sameCampaignRows(prev, others) ? prev : others))
      } catch {
        setOtherCampaigns((prev) => (prev.length === 0 ? prev : []))
      }
    },
    [fetchJson],
  )

  const loadPeople = useCallback(async () => {
    if (peopleLoadedRef.current) return
    peopleLoadedRef.current = true
    setPeopleLoading(true)
    try {
      const people = asEntitySearchResults(
        await fetchJson('/api/entity-search?types=person&limit=50'),
      ).map(
        (person): AtMentionItem => ({
          id: person.id,
          label: person.label,
          section: 'person',
          type: person.personKind ?? 'portal_user',
          thumbnailUrl: person.iconUrl ?? undefined,
          brainId: person.brainId ?? undefined,
        }),
      )
      peopleItemsRef.current = people
    } catch {
      peopleItemsRef.current = []
    } finally {
      setPeopleLoading(false)
    }
  }, [fetchJson])

  useEffect(() => {
    allAtItemsRef.current = []
    atLoadedCampaignIdRef.current = null
    atLoadingRef.current = false
    otherCampaignsLoadedRef.current = false
    peopleLoadedRef.current = false
    peopleItemsRef.current = []
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
          : [...peopleItemsRef.current, ...allAtItemsRef.current, ...spaceTaskMentionsRef.current]
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
    void loadPeople()
    void loadOtherCampaigns(campaignId)
  }, [atMenuOpen, campaignId, loadAtMentionData, loadOtherCampaigns, loadPeople])

  useEffect(() => {
    if (atDataLoading || peopleLoading || !atMenuOpen) return
    const textarea = textareaRef.current
    if (!textarea) return
    syncAtMenuFromComposer(textarea.value, textarea.selectionStart)
  }, [atDataLoading, peopleLoading, atMenuOpen, syncAtMenuFromComposer, textareaRef])

  useEffect(() => {
    if (!crossCampaignId) {
      setCrossCampaignItems((prev) => (prev.length === 0 ? prev : []))
      return
    }
    setCrossCampaignLoading(true)
    const load = async () => {
      const items: AtMentionItem[] = []
      const [offersRes, funnelsRes, sequencesRes, mediaRes, missionRes] = await Promise.allSettled([
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
    atDataLoading: atDataLoading || peopleLoading,
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
