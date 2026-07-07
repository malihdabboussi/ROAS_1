import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { listAssets, type MediaAsset } from '@/lib/services/media-api'
import { createClient } from '@/lib/supabase/client'
import { STUDIO_INLINE_ERRORS } from '../../../config/studio-inline-errors.config'
import {
  fetchCampaignDeliverables,
  fetchCampaignDocuments,
  type CampaignDeliverable,
} from '../../../services/artifact-preview.service'
import { fetchConversationAssets } from '../../../services/chat.service'
import type { ConversationDocument } from '../../../types'
import type { LinkRow } from './media-tab.types'

interface UseMediaTabDataParams {
  campaignId: string
  searchQuery: string
}

interface UseMediaTabDataResult {
  nonImageDocs: ConversationDocument[]
  groupedDocs: Record<string, ConversationDocument[]>
  images: MediaAsset[]
  videos: MediaAsset[]
  audios: MediaAsset[]
  fileAssets: MediaAsset[]
  filteredDeliverables: CampaignDeliverable[]
  filteredLinkRows: LinkRow[]
  loading: boolean
  docsError: string | null
  assetsError: string | null
  deliverablesError: string | null
  setDocs: Dispatch<SetStateAction<ConversationDocument[]>>
  setAssets: Dispatch<SetStateAction<MediaAsset[]>>
  loadDocs: () => Promise<void>
  loadAssets: () => Promise<void>
}

export function useMediaTabData({
  campaignId,
  searchQuery,
}: UseMediaTabDataParams): UseMediaTabDataResult {
  const [docs, setDocs] = useState<ConversationDocument[]>([])
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [deliverables, setDeliverables] = useState<CampaignDeliverable[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [deliverablesLoading, setDeliverablesLoading] = useState(true)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [assetsError, setAssetsError] = useState<string | null>(null)
  const [deliverablesError, setDeliverablesError] = useState<string | null>(null)
  const [linkRows, setLinkRows] = useState<LinkRow[]>([])
  const [, setLinksLoading] = useState(true)

  const loadDocs = useCallback(async () => {
    if (!campaignId) return
    setDocsLoading(true)
    setDocsError(null)
    try {
      const data = await fetchCampaignDocuments(campaignId)
      setDocs(data)
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_DOCUMENTS)
    } finally {
      setDocsLoading(false)
    }
  }, [campaignId])

  const loadAssets = useCallback(async () => {
    setAssetsLoading(true)
    setAssetsError(null)
    try {
      const result = await listAssets({ campaign_id: campaignId, limit: 100 })
      setAssets(result.assets)
    } catch (err) {
      setAssetsError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_MEDIA)
    } finally {
      setAssetsLoading(false)
    }
  }, [campaignId])

  const loadDeliverables = useCallback(async () => {
    if (!campaignId) return
    setDeliverablesLoading(true)
    setDeliverablesError(null)
    try {
      const data = await fetchCampaignDeliverables(campaignId)
      setDeliverables(data)
    } catch (err) {
      setDeliverablesError(err instanceof Error ? err.message : 'Failed to load deliverables')
    } finally {
      setDeliverablesLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    void loadDocs()
  }, [loadDocs])
  useEffect(() => {
    void loadAssets()
  }, [loadAssets])
  useEffect(() => {
    void loadDeliverables()
  }, [loadDeliverables])

  useEffect(() => {
    if (!campaignId) return
    const supabase = createClient()
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        void Promise.all([loadAssets(), loadDocs(), loadDeliverables()])
      }, 400)
    }
    const channel = supabase
      .channel(`media-tab:${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_assets',
          filter: `campaign_id=eq.${campaignId}`,
        },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_documents',
          filter: `campaign_id=eq.${campaignId}`,
        },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_deliverables',
          filter: `campaign_id=eq.${campaignId}`,
        },
        scheduleRefresh,
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase.removeChannel(channel)
    }
  }, [campaignId, loadAssets, loadDocs, loadDeliverables])

  const loadLinks = useCallback(async () => {
    if (!campaignId) return
    setLinksLoading(true)
    try {
      const allItems: LinkRow[] = []
      let before: string | undefined
      const limit = 100
      for (let page = 0; page < 10; page++) {
        const res = await fetchConversationAssets('links', {
          campaign_id: campaignId,
          limit,
          before,
        })
        for (const item of res.items) {
          if (item.url) {
            allItems.push({
              id: item.id,
              url: item.url,
              title: item.title ?? item.url,
              messageId: item.message_id ?? '',
              role: 'assistant',
              createdAt: item.created_at,
            })
          }
        }
        if (!res.nextCursor) break
        before = res.nextCursor
      }
      setLinkRows(allItems)
    } catch {
      setLinkRows([])
    } finally {
      setLinksLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  const q = searchQuery.trim().toLowerCase()
  const nonImageDocs = useMemo(() => {
    const base = docs.filter((d) => d.document_type !== 'image_upload')
    if (!q) return base
    return base.filter((d) => (d.title ?? '').toLowerCase().includes(q))
  }, [docs, q])
  const groupedDocs = useMemo(
    () =>
      nonImageDocs.reduce<Record<string, ConversationDocument[]>>((acc, doc) => {
        const type = doc.document_type
        if (!acc[type]) acc[type] = []
        acc[type].push(doc)
        return acc
      }, {}),
    [nonImageDocs],
  )

  const allImages = useMemo(() => assets.filter((a) => a.asset_type === 'image'), [assets])
  const allVideos = useMemo(() => assets.filter((a) => a.asset_type === 'video'), [assets])
  const allAudios = useMemo(() => assets.filter((a) => a.asset_type === 'audio'), [assets])
  const allFileAssets = useMemo(() => assets.filter((a) => a.asset_type === 'document'), [assets])
  const images = useMemo(
    () => (q ? allImages.filter((a) => (a.name ?? '').toLowerCase().includes(q)) : allImages),
    [allImages, q],
  )
  const videos = useMemo(
    () => (q ? allVideos.filter((a) => (a.name ?? '').toLowerCase().includes(q)) : allVideos),
    [allVideos, q],
  )
  const audios = useMemo(
    () => (q ? allAudios.filter((a) => (a.name ?? '').toLowerCase().includes(q)) : allAudios),
    [allAudios, q],
  )
  const fileAssets = useMemo(
    () =>
      q ? allFileAssets.filter((a) => (a.name ?? '').toLowerCase().includes(q)) : allFileAssets,
    [allFileAssets, q],
  )
  const filteredDeliverables = useMemo(
    () => (q ? deliverables.filter((d) => d.title.toLowerCase().includes(q)) : deliverables),
    [deliverables, q],
  )
  const filteredLinkRows = useMemo(
    () =>
      q
        ? linkRows.filter(
            (r) => r.title.toLowerCase().includes(q) || r.url.toLowerCase().includes(q),
          )
        : linkRows,
    [linkRows, q],
  )

  return {
    nonImageDocs,
    groupedDocs,
    images,
    videos,
    audios,
    fileAssets,
    filteredDeliverables,
    filteredLinkRows,
    loading: docsLoading || assetsLoading || deliverablesLoading,
    docsError,
    assetsError,
    deliverablesError,
    setDocs,
    setAssets,
    loadDocs,
    loadAssets,
  }
}
