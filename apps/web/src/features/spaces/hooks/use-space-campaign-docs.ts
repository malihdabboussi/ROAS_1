import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchCampaignDeliverables,
  fetchCampaignDocuments,
} from '@/features/studio/services/artifact-preview.service'
import type { ConversationDocument } from '@/features/studio/types'
import { extractMarkdownFromDocumentContent } from '@/lib/content/document-content-markdown'
import { markdownToHtml } from '@/lib/content/markdown-to-html'
import { useSpacesStore } from '../store/use-spaces-store'
import type { SpaceItem } from '../types'

function conversationDocumentBodyHtml(doc: ConversationDocument): string | null {
  const raw = doc.content
  if (typeof raw === 'string') {
    const fromMd = extractMarkdownFromDocumentContent(raw)
    return markdownToHtml(fromMd ?? raw)
  }
  const extracted = extractMarkdownFromDocumentContent(raw)
  if (extracted) return markdownToHtml(extracted)
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    return markdownToHtml(
      (o.html as string | undefined) ??
        (o.source_content as string | undefined) ??
        (o.text as string | undefined) ??
        null,
    )
  }
  return null
}

export function useSpaceCampaignDocs(opts: {
  isDocsView: boolean
  campaignId: string | null
  activeSpaceId: string | null
  currentUserId: string | null
  itemsLoadedForSpaceId: string | null
  items: SpaceItem[]
}) {
  const { isDocsView, campaignId, activeSpaceId, currentUserId, itemsLoadedForSpaceId, items } =
    opts

  const [campaignDocs, setCampaignDocs] = useState<SpaceItem[]>([])
  const [campaignDocsLoaded, setCampaignDocsLoaded] = useState<string | null>(null)
  const [campaignDocsLoading, setCampaignDocsLoading] = useState(false)
  const [campaignDocsIncludeRequested, setCampaignDocsIncludeRequested] = useState(false)
  const [driveMappingsSyncing, setDriveMappingsSyncing] = useState(false)

  const expectedDocsLoadedKey =
    campaignId && activeSpaceId ? `${activeSpaceId}:${campaignId}` : null

  const campaignDocsSynced =
    expectedDocsLoadedKey !== null && campaignDocsLoaded === expectedDocsLoadedKey

  useEffect(() => {
    setCampaignDocsIncludeRequested(false)
    setCampaignDocs([])
    setCampaignDocsLoaded(null)
    setCampaignDocsLoading(false)
  }, [activeSpaceId, campaignId])

  const loadCampaignDocs = useCallback(() => {
    setCampaignDocsIncludeRequested(true)
    setCampaignDocsLoaded(null)
  }, [])

  const reloadCampaignDocs = useCallback(() => {
    setCampaignDocsIncludeRequested(true)
    setCampaignDocsLoaded(null)
  }, [])

  const docsLoading = isDocsView && itemsLoadedForSpaceId !== activeSpaceId

  useEffect(() => {
    if (
      !campaignDocsIncludeRequested ||
      !campaignId ||
      !activeSpaceId ||
      itemsLoadedForSpaceId !== activeSpaceId
    ) {
      if (!campaignDocsIncludeRequested) {
        setCampaignDocsLoading(false)
      }
      return
    }
    const docsLoadedKey = `${activeSpaceId}:${campaignId}`
    if (campaignDocsLoaded === docsLoadedKey) return
    let cancelled = false
    setCampaignDocsLoading(true)

    const DOC_DELIVERABLE_TYPES = new Set(['doc', 'text', 'pdf', 'file'])
    const MEDIA_DOC_TYPES = new Set(['image_upload'])

    ;(async () => {
      try {
        const [convDocs, deliverables] = await Promise.all([
          fetchCampaignDocuments(campaignId),
          fetchCampaignDeliverables(campaignId),
        ])
        if (cancelled) return

        const spaceId = activeSpaceId
        const userId = currentUserId ?? ''
        const now = new Date().toISOString()

        const fromConvDocs: SpaceItem[] = convDocs
          .filter((d) => !MEDIA_DOC_TYPES.has(d.document_type))
          .map((d) => {
            const docMeta = (d as { metadata?: Record<string, unknown> }).metadata ?? {}
            const coverUrl =
              typeof docMeta._doc_cover_url === 'string' && docMeta._doc_cover_url.trim()
                ? docMeta._doc_cover_url
                : undefined
            const docStatus =
              typeof docMeta._space_item_status === 'string' && docMeta._space_item_status.trim()
                ? docMeta._space_item_status
                : 'todo'
            return {
              id: `cdoc:${d.id}`,
              space_id: spaceId,
              org_id: '',
              user_id: userId,
              title: d.title || d.document_type || 'Untitled',
              description: null,
              status: docStatus as SpaceItem['status'],
              priority: null,
              assignee_type: 'unassigned' as const,
              assignee_id: null,
              assignees: [],
              start_date: null,
              due_date: null,
              recurrence: null,
              parent_item_id: null,
              recurrence_parent_id: null,
              notes: null,
              doc_body: conversationDocumentBodyHtml(d),
              source: 'manual' as const,
              linked_mission_id: null,
              form_id: null,
              task_execution_status: null,
              sort_order: 0,
              custom_data: {
                _view_type: 'doc',
                _doc_source: 'campaign',
                _doc_type: d.document_type,
                _source_id: d.id,
                ...(coverUrl ? { _doc_cover_url: coverUrl } : {}),
              },
              is_private: false,
              share_link_enabled: false,
              share_token: null,
              created_at: d.created_at,
              updated_at: d.updated_at,
            }
          })

        const fromDeliverables: SpaceItem[] = deliverables
          .filter((d) => DOC_DELIVERABLE_TYPES.has(d.type))
          .map((d) => {
            const delMeta = d.metadata ?? {}
            const coverUrl =
              typeof delMeta._doc_cover_url === 'string' && delMeta._doc_cover_url.trim()
                ? delMeta._doc_cover_url
                : undefined
            const delStatus =
              typeof delMeta._space_item_status === 'string' && delMeta._space_item_status.trim()
                ? delMeta._space_item_status
                : 'todo'
            return {
              id: `mdel:${d.id}`,
              space_id: spaceId,
              org_id: '',
              user_id: d.user_id,
              title: d.title || 'Mission document',
              description: null,
              status: delStatus as SpaceItem['status'],
              priority: null,
              assignee_type: 'unassigned' as const,
              assignee_id: null,
              assignees: [],
              start_date: null,
              due_date: null,
              recurrence: null,
              parent_item_id: null,
              recurrence_parent_id: null,
              notes: null,
              doc_body: markdownToHtml(d.content),
              source: 'manual' as const,
              linked_mission_id: d.mission_id,
              form_id: null,
              task_execution_status: null,
              sort_order: 0,
              custom_data: {
                _view_type: 'doc',
                _doc_source: 'campaign',
                _doc_type: d.type,
                _source_id: d.id,
                ...(coverUrl ? { _doc_cover_url: coverUrl } : {}),
              },
              is_private: false,
              share_link_enabled: false,
              share_token: null,
              created_at: d.created_at,
              updated_at: now,
            }
          })

        const spaceSourceIds = new Set(
          useSpacesStore
            .getState()
            .items.map(
              (i) => (i.custom_data as Record<string, unknown>)?._source_id as string | undefined,
            )
            .filter(Boolean),
        )
        // Display-only overlay: surface campaign docs in this Docs view WITHOUT
        // persisting them as rows in the space (no space_id ownership). Docs that
        // already have a real row here are skipped via their _source_id so we never
        // show duplicates. This keeps "Include all campaign docs" a view, not a copy.
        const overlayDocs = [...fromConvDocs, ...fromDeliverables].filter((doc) => {
          const sourceId = (doc.custom_data as Record<string, unknown>)._source_id as
            | string
            | undefined
          return Boolean(sourceId) && !spaceSourceIds.has(sourceId)
        })

        if (!cancelled) {
          setCampaignDocs(overlayDocs)
          setCampaignDocsLoaded(docsLoadedKey)
        }
      } catch {
        if (!cancelled) {
          setCampaignDocs([])
          setCampaignDocsLoaded(docsLoadedKey)
        }
      } finally {
        if (!cancelled) setCampaignDocsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    campaignDocsIncludeRequested,
    campaignId,
    activeSpaceId,
    currentUserId,
    itemsLoadedForSpaceId,
    campaignDocsLoaded,
  ])

  const spaceDocItems = useMemo(
    () =>
      items.filter((item) => (item.custom_data as Record<string, unknown>)?._view_type === 'doc'),
    [items],
  )

  const hasDriveDocs = useMemo(
    () =>
      spaceDocItems.some(
        (item) =>
          ((item.custom_data as Record<string, unknown>)?._doc_source as string | undefined) ===
          'drive',
      ),
    [spaceDocItems],
  )

  const docItems = useMemo(() => {
    if (!campaignDocsIncludeRequested || campaignDocs.length === 0) return spaceDocItems
    const spaceSourceIds = new Set(
      spaceDocItems
        .map((i) => (i.custom_data as Record<string, unknown>)?._source_id as string | undefined)
        .filter(Boolean),
    )
    const dedupedCampaign = campaignDocs.filter(
      (d) => !spaceSourceIds.has((d.custom_data as Record<string, unknown>)?._source_id as string),
    )
    return [...spaceDocItems, ...dedupedCampaign]
  }, [spaceDocItems, campaignDocs, campaignDocsIncludeRequested])

  return {
    campaignDocs,
    campaignDocsLoaded,
    campaignDocsLoading,
    campaignDocsIncludeRequested,
    campaignDocsSynced,
    driveMappingsSyncing,
    setDriveMappingsSyncing,
    loadCampaignDocs,
    reloadCampaignDocs,
    spaceDocItems,
    hasDriveDocs,
    docsLoading,
    docItems,
  }
}
