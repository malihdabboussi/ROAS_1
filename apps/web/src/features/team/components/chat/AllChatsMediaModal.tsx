'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { conversationDocumentToPendingArtifact } from '@/lib/artifacts/conversation-document-to-pending-artifact'
import { openStudioArtifactInNewTab } from '@/lib/artifacts/open-studio-artifact'
import {
  fetchConversationAssets,
  type ConversationAssetFeedItem,
} from '@/lib/conversations/conversations-api'
import {
  ArtifactDocumentFeed,
  LinksTable,
  MediaGrid,
  mapAllChatsDocRows,
  mapAllChatsLinkRows,
  mapAllChatsMediaRows,
  type AllChatsDocRow,
  type AllChatsLinkRow,
  type AllChatsMediaRow,
} from './all-chats-media-feed'

export type AllChatsScope = 'artifacts' | 'documents' | 'media' | 'links'

interface AllChatsMediaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialScope: AllChatsScope
  agents: MissionAgent[]
  onNavigateToConversation: (params: {
    conversationId: string
    messageId?: string
    agentKey: string
  }) => void
}

const FEED_BATCH_SIZE = 50

export function AllChatsMediaModal({
  open,
  onOpenChange,
  initialScope,
  agents,
  onNavigateToConversation,
}: AllChatsMediaModalProps) {
  const [scope, setScope] = useState<AllChatsScope>(initialScope)
  const [initialLoading, setInitialLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [artifactRows, setArtifactRows] = useState<AllChatsDocRow[]>([])
  const [documentRows, setDocumentRows] = useState<AllChatsDocRow[]>([])
  const [linkRows, setLinkRows] = useState<AllChatsLinkRow[]>([])
  const [mediaRows, setMediaRows] = useState<AllChatsMediaRow[]>([])
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const initialLoadingRef = useRef(false)
  const loadingMoreRef = useRef(false)
  const cursorsRef = useRef<Record<AllChatsScope, string | null>>({
    artifacts: null,
    documents: null,
    media: null,
    links: null,
  })
  const hasMoreRef = useRef<Record<AllChatsScope, boolean>>({
    artifacts: true,
    documents: true,
    media: true,
    links: true,
  })
  const [hasMoreState, setHasMoreState] = useState<Record<AllChatsScope, boolean>>({
    artifacts: true,
    documents: true,
    media: true,
    links: true,
  })
  const genRef = useRef(0)

  useEffect(() => {
    if (open) setScope(initialScope)
  }, [open, initialScope])

  const applyPage = useCallback(
    (targetScope: AllChatsScope, items: ConversationAssetFeedItem[], append: boolean) => {
      if (targetScope === 'artifacts') {
        const mapped = mapAllChatsDocRows(items)
        setArtifactRows((prev) => (append ? [...prev, ...mapped] : mapped))
      } else if (targetScope === 'documents') {
        const mapped = mapAllChatsDocRows(items)
        setDocumentRows((prev) => (append ? [...prev, ...mapped] : mapped))
      } else if (targetScope === 'links') {
        const mapped = mapAllChatsLinkRows(items)
        setLinkRows((prev) => (append ? [...prev, ...mapped] : mapped))
      } else {
        const mapped = mapAllChatsMediaRows(items)
        setMediaRows((prev) => (append ? [...prev, ...mapped] : mapped))
      }
    },
    [],
  )

  const loadScope = useCallback(
    async (targetScope: AllChatsScope, append: boolean) => {
      if (
        append &&
        (!hasMoreRef.current[targetScope] || loadingMoreRef.current || initialLoadingRef.current)
      ) {
        return
      }
      if (!append && initialLoadingRef.current) return

      const g = genRef.current
      if (append) {
        loadingMoreRef.current = true
        setLoadingMore(true)
      } else {
        initialLoadingRef.current = true
        setInitialLoading(true)
      }

      try {
        const res = await fetchConversationAssets(targetScope, {
          limit: FEED_BATCH_SIZE,
          before: append ? (cursorsRef.current[targetScope] ?? undefined) : undefined,
        })
        if (g !== genRef.current) return
        const items = res.items ?? []
        applyPage(targetScope, items, append)
        cursorsRef.current[targetScope] = res.nextCursor ?? null
        hasMoreRef.current[targetScope] = Boolean(res.nextCursor)
        setHasMoreState((prev) => ({ ...prev, [targetScope]: Boolean(res.nextCursor) }))
      } finally {
        if (g === genRef.current) {
          if (append) {
            loadingMoreRef.current = false
            setLoadingMore(false)
          } else {
            initialLoadingRef.current = false
            setInitialLoading(false)
          }
        }
      }
    },
    [applyPage],
  )

  useEffect(() => {
    if (!open) return
    genRef.current += 1
    initialLoadingRef.current = false
    loadingMoreRef.current = false
    cursorsRef.current = { artifacts: null, documents: null, media: null, links: null }
    hasMoreRef.current = { artifacts: true, documents: true, media: true, links: true }
    setHasMoreState({ artifacts: true, documents: true, media: true, links: true })
    setArtifactRows([])
    setDocumentRows([])
    setLinkRows([])
    setMediaRows([])
    void loadScope(initialScope, false)
  }, [open, initialScope, loadScope])

  useEffect(() => {
    if (!open) return
    const currentRows =
      scope === 'artifacts'
        ? artifactRows
        : scope === 'documents'
          ? documentRows
          : scope === 'links'
            ? linkRows
            : mediaRows
    if (currentRows.length === 0 && hasMoreRef.current[scope] && !initialLoading) {
      void loadScope(scope, false)
    }
  }, [open, scope, artifactRows, documentRows, linkRows, mediaRows, initialLoading, loadScope])

  const handleBodyScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMoreRef.current[scope] || loadingMore || initialLoading) return
      const el = e.currentTarget
      if (el.scrollHeight - el.scrollTop - el.clientHeight <= 120) {
        void loadScope(scope, true)
      }
    },
    [scope, loadingMore, initialLoading, loadScope],
  )

  useEffect(() => {
    if (!open || initialLoading || loadingMore || !hasMoreRef.current[scope]) return
    const el = bodyRef.current
    if (!el) return
    if (el.scrollHeight <= el.clientHeight + 1) {
      void loadScope(scope, true)
    }
  }, [
    open,
    scope,
    artifactRows.length,
    documentRows.length,
    mediaRows.length,
    linkRows.length,
    initialLoading,
    loadingMore,
    loadScope,
  ])

  if (!open) return null

  return (
    <div className="z-modal-backdrop p-spacing-4 fixed inset-0 flex items-center justify-center bg-modal-overlay">
      <div className="surface-card border-border rounded-spacing-4 flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden border shadow-xl">
        <div className="border-border px-spacing-6 py-spacing-3 relative flex shrink-0 items-center border-b">
          <h2 className="title-h6 text-foreground shrink-0 uppercase">Media</h2>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto flex gap-1">
              {(
                [
                  ['artifacts', 'Artifacts'],
                  ['documents', 'Docs'],
                  ['media', 'Media'],
                  ['links', 'Links'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  className={`body-3 rounded-spacing-2 px-spacing-3 py-spacing-1 ${
                    scope === key
                      ? 'nav-glass-selected-purple'
                      : 'text-muted-foreground hover:bg-hover-subtle'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="btn-icon-bare"
              aria-label="Close"
            >
              <X className="icon-sm" />
            </button>
          </div>
        </div>

        <div
          ref={bodyRef}
          className="scrollbar-hide p-spacing-6 min-h-0 flex-1 overflow-y-auto"
          onScroll={handleBodyScroll}
        >
          {initialLoading ? (
            <div className="flex h-full items-center justify-center">
              <VibeyLoadingOrb text="Loading media..." state="processing" size="md" />
            </div>
          ) : scope === 'artifacts' ? (
            <ArtifactDocumentFeed
              rows={artifactRows}
              agents={agents}
              onOpen={(doc, conversationId, agentKey) => {
                const pending = conversationDocumentToPendingArtifact(doc)
                if (pending && doc.campaign_id) {
                  openStudioArtifactInNewTab({
                    campaignId: doc.campaign_id,
                    pending,
                  })
                  onOpenChange(false)
                  return
                }
                onNavigateToConversation({ conversationId, agentKey })
                onOpenChange(false)
              }}
            />
          ) : scope === 'documents' ? (
            <ArtifactDocumentFeed
              rows={documentRows}
              agents={agents}
              onOpen={(_doc, navigationConversationId, agentKey) => {
                onNavigateToConversation({ conversationId: navigationConversationId, agentKey })
                onOpenChange(false)
              }}
            />
          ) : scope === 'media' ? (
            <MediaGrid
              rows={mediaRows}
              agents={agents}
              onGoTo={(conversationId, messageId, agentKey) => {
                onNavigateToConversation({ conversationId, messageId, agentKey })
                onOpenChange(false)
              }}
            />
          ) : (
            <LinksTable
              rows={linkRows}
              agents={agents}
              onGoTo={(conversationId, messageId, agentKey) => {
                onNavigateToConversation({ conversationId, messageId, agentKey })
                onOpenChange(false)
              }}
            />
          )}
          {loadingMore ? (
            hasMoreState[scope] ? (
              <div className="py-spacing-4 flex items-center justify-center">
                <VibeyLoadingOrb text="Loading more..." state="processing" size="sm" />
              </div>
            ) : null
          ) : null}
        </div>
      </div>
    </div>
  )
}
