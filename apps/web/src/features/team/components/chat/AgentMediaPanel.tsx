'use client'

import { useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { conversationDocumentToPendingArtifact } from '@/lib/artifacts/conversation-document-to-pending-artifact'
import { openStudioArtifactInNewTab } from '@/lib/artifacts/open-studio-artifact'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'
import { useAgentMedia } from '../../hooks/useAgentMedia'
import { AllChatsMediaModal, type AllChatsScope } from './AllChatsMediaModal'
import { AssetRowMenu, LinkRowMenu } from './agent-media-row-menus'
import { ChatMediaTile } from './ChatMediaTile'
import { ConversationArtifactPreviewCard } from './ConversationArtifactPreviewCard'

const SCROLL_LOAD_THRESHOLD_PX = 80

interface AgentMediaPanelProps {
  agentKey: string
  teamAgents: MissionAgent[]
  onNavigateToConversation: (params: {
    conversationId: string
    messageId?: string
    agentKey: string
  }) => void
  onClose: () => void
  fullScreen?: boolean
}

function docFileUrl(doc: ConversationDocument): string | null {
  const c = doc.content
  if (c && typeof c === 'object' && typeof (c as { file_url?: string }).file_url === 'string') {
    return (c as { file_url: string }).file_url
  }
  return null
}

function onScrollLoadMore(
  e: React.UIEvent<HTMLDivElement>,
  loadMore: () => void,
  hasMore: boolean,
  loading: boolean,
) {
  if (!hasMore || loading) return
  const el = e.currentTarget
  if (el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_LOAD_THRESHOLD_PX) {
    loadMore()
  }
}

export function AgentMediaPanel({
  agentKey,
  teamAgents,
  onNavigateToConversation,
  onClose,
  fullScreen = false,
}: AgentMediaPanelProps) {
  const {
    docsLoading,
    docsError,
    artifactDocs,
    fileDocs,
    mediaRows,
    linkRows,
    loadMore,
    hasMore,
    messagesLoading,
    convosLoading,
    refresh,
  } = useAgentMedia(agentKey)

  const [menuForId, setMenuForId] = useState<string | null>(null)
  const [allChatsOpen, setAllChatsOpen] = useState(false)
  const [allChatsScope, setAllChatsScope] = useState<AllChatsScope>('documents')

  const scrollHandler = (e: React.UIEvent<HTMLDivElement>) =>
    onScrollLoadMore(e, loadMore, hasMore, messagesLoading || convosLoading)

  const shellClass = fullScreen
    ? 'surface-bg fixed inset-0 z-40 flex flex-col'
    : 'flex h-full min-h-0 w-[min(100%,380px)] shrink-0 flex-col'

  return (
    <div className={shellClass}>
      <div className="card-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0">
        {onClose ? (
          <div className="border-border px-spacing-3 py-spacing-2 flex shrink-0 items-center justify-between border-b">
            <h2 className="title-h6 text-foreground">Media</h2>
            <div className="gap-spacing-1 flex items-center">
              <button
                type="button"
                onClick={refresh}
                className="btn-icon-glass btn-icon-glass-sm"
                aria-label="Refresh"
              >
                <RefreshCw className="icon-sm" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-icon-glass btn-icon-glass-sm"
                aria-label="Close"
              >
                <X className="icon-sm" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="px-spacing-2 pb-spacing-2 pt-spacing-2 flex min-h-0 flex-1 flex-col">
          <Tabs defaultValue="artifacts" className="flex min-h-0 flex-1 flex-col">
            <div className="pb-spacing-2 shrink-0">
              <TabsList variant="full" className="flex-wrap">
                <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
                <TabsTrigger value="documents">Docs</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="links">Links</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="artifacts" className="mt-0 flex min-h-0 flex-1 flex-col">
              <div
                className="scrollbar-hide min-h-0 flex-1 overflow-y-auto"
                onScroll={scrollHandler}
              >
                {docsLoading ? (
                  <div className="py-spacing-8 flex flex-1 items-center justify-center">
                    <VibeyLoadingOrb text="Loading Artifacts" state="processing" size="sm" />
                  </div>
                ) : docsError ? (
                  <p className="body-4 px-spacing-2 text-destructive">{docsError}</p>
                ) : artifactDocs.length === 0 ? (
                  <p className="body-4 text-muted-foreground px-spacing-2">
                    No artifacts for this agent.
                  </p>
                ) : (
                  <ul className="space-y-spacing-3">
                    {artifactDocs.map((doc) => (
                      <li key={doc.id} className="relative">
                        <div className="right-spacing-2 top-spacing-2 absolute z-10">
                          <AssetRowMenu
                            doc={doc}
                            menuForId={menuForId}
                            setMenuForId={setMenuForId}
                          />
                        </div>
                        <ConversationArtifactPreviewCard
                          doc={doc}
                          className="pr-spacing-10"
                          onOpen={() => {
                            const pending = conversationDocumentToPendingArtifact(doc)
                            if (pending && doc.campaign_id) {
                              openStudioArtifactInNewTab({
                                campaignId: doc.campaign_id,
                                pending,
                              })
                              return
                            }
                            onNavigateToConversation({
                              conversationId: doc.conversation_id,
                              agentKey,
                            })
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {messagesLoading && hasMore ? (
                  <div className="py-spacing-3 flex items-center justify-center">
                    <VibeyLoadingOrb state="processing" size="sm" />
                  </div>
                ) : null}
              </div>
              <div className="pt-spacing-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAllChatsScope('artifacts')
                    setAllChatsOpen(true)
                  }}
                  className="button-glass-neutral body-4 rounded-spacing-2 px-spacing-3 py-spacing-2 w-full text-left"
                >
                  View artifacts from all chats
                </button>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="mt-0 flex min-h-0 flex-1 flex-col">
              <div
                className="scrollbar-hide min-h-0 flex-1 overflow-y-auto"
                onScroll={scrollHandler}
              >
                {docsLoading ? (
                  <div className="py-spacing-8 flex flex-1 items-center justify-center">
                    <VibeyLoadingOrb text="Loading Docs" state="processing" size="sm" />
                  </div>
                ) : fileDocs.length === 0 ? (
                  <p className="body-4 text-muted-foreground px-spacing-2">
                    No documents for this agent.
                  </p>
                ) : (
                  <ul className="space-y-spacing-3">
                    {fileDocs.map((doc) => {
                      const url = docFileUrl(doc)
                      return (
                        <li key={doc.id} className="relative">
                          <div className="right-spacing-2 top-spacing-2 absolute z-10">
                            <AssetRowMenu
                              doc={doc}
                              menuForId={menuForId}
                              setMenuForId={setMenuForId}
                              openUrl={url}
                            />
                          </div>
                          <ConversationArtifactPreviewCard
                            doc={doc}
                            className="pr-spacing-10"
                            onOpen={() => {
                              if (url) window.open(url, '_blank', 'noopener,noreferrer')
                              else
                                onNavigateToConversation({
                                  conversationId: doc.conversation_id,
                                  agentKey,
                                })
                            }}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
                {messagesLoading && hasMore ? (
                  <div className="py-spacing-3 flex items-center justify-center">
                    <VibeyLoadingOrb state="processing" size="sm" />
                  </div>
                ) : null}
              </div>
              <div className="pt-spacing-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAllChatsScope('documents')
                    setAllChatsOpen(true)
                  }}
                  className="button-glass-neutral body-4 rounded-spacing-2 px-spacing-3 py-spacing-2 w-full text-left"
                >
                  View docs from all chats
                </button>
              </div>
            </TabsContent>

            <TabsContent value="media" className="mt-0 flex min-h-0 flex-1 flex-col">
              <div
                className="scrollbar-hide min-h-0 flex-1 overflow-y-auto"
                onScroll={scrollHandler}
              >
                {(convosLoading || messagesLoading) && mediaRows.length === 0 ? (
                  <div className="py-spacing-8 flex flex-1 items-center justify-center">
                    <VibeyLoadingOrb text="Loading Media" state="processing" size="sm" />
                  </div>
                ) : mediaRows.length === 0 && !convosLoading && !messagesLoading ? (
                  <p className="body-4 text-muted-foreground px-spacing-2">
                    No images or videos found.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {mediaRows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => window.open(row.url, '_blank', 'noopener,noreferrer')}
                        className="rounded-spacing-1 bg-surface-subtle relative aspect-square overflow-hidden border border-border"
                      >
                        <ChatMediaTile kind={row.kind} url={row.url} alt="" />
                      </button>
                    ))}
                  </div>
                )}
                {messagesLoading && hasMore ? (
                  <div className="py-spacing-3 flex items-center justify-center">
                    <VibeyLoadingOrb state="processing" size="sm" />
                  </div>
                ) : null}
              </div>
              <div className="pt-spacing-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAllChatsScope('media')
                    setAllChatsOpen(true)
                  }}
                  className="button-glass-neutral body-4 rounded-spacing-2 px-spacing-3 py-spacing-2 w-full text-left"
                >
                  View media from all chats
                </button>
              </div>
            </TabsContent>

            <TabsContent value="links" className="mt-0 flex min-h-0 flex-1 flex-col">
              <div
                className="scrollbar-hide min-h-0 flex-1 overflow-y-auto"
                onScroll={scrollHandler}
              >
                {(convosLoading || messagesLoading) && linkRows.length === 0 ? (
                  <div className="py-spacing-8 flex flex-1 items-center justify-center">
                    <VibeyLoadingOrb text="Loading Links" state="processing" size="sm" />
                  </div>
                ) : linkRows.length === 0 && !convosLoading && !messagesLoading ? (
                  <p className="body-4 text-muted-foreground px-spacing-2">No links found.</p>
                ) : (
                  <ul className="space-y-spacing-2">
                    {linkRows.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-spacing-2 p-spacing-3 relative border border-border bg-surface-subtle"
                      >
                        <div className="right-spacing-2 top-spacing-2 absolute z-10">
                          <LinkRowMenu
                            row={row}
                            menuForId={menuForId}
                            setMenuForId={setMenuForId}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => window.open(row.url, '_blank', 'noopener,noreferrer')}
                          className="body-3 text-status-emerald pr-spacing-8 block w-full min-w-0 text-left font-medium hover:underline"
                        >
                          {row.title}
                        </button>
                        <p className="body-4 text-muted-foreground mt-1 truncate">{row.url}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {messagesLoading && hasMore ? (
                  <div className="py-spacing-3 flex items-center justify-center">
                    <VibeyLoadingOrb state="processing" size="sm" />
                  </div>
                ) : null}
              </div>
              <div className="pt-spacing-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAllChatsScope('links')
                    setAllChatsOpen(true)
                  }}
                  className="button-glass-neutral body-4 rounded-spacing-2 px-spacing-3 py-spacing-2 w-full text-left"
                >
                  View links from all chats
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AllChatsMediaModal
        open={allChatsOpen}
        onOpenChange={setAllChatsOpen}
        initialScope={allChatsScope}
        agents={teamAgents}
        onNavigateToConversation={onNavigateToConversation}
      />
    </div>
  )
}
