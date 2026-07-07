'use client'

import { ExternalLink } from 'lucide-react'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'
import type { Conversation } from '@/lib/conversations/conversation.types'
import type { ConversationAssetFeedItem } from '@/lib/conversations/conversations-api'
import { ChatMediaTile } from '@/features/team/components/chat/ChatMediaTile'
import { ConversationArtifactPreviewCard } from '@/features/team/components/chat/ConversationArtifactPreviewCard'

export type AllChatsLinkRow = {
  id: string
  url: string
  title: string
  messageId: string
  messageSnippet: string
  conversationId: string
  agentKey: string
  createdAt: string
}

export type AllChatsMediaRow = {
  id: string
  kind: 'image' | 'video'
  url: string
  conversationId: string
  agentKey: string
  messageId: string
  createdAt: string
}

export type AllChatsDocRow = {
  id: string
  doc: ConversationDocument
  conversation: Conversation
}

function agentForKey(agents: MissionAgent[], agentKey: string | null): MissionAgent | null {
  if (!agentKey) return null
  return agents.find((x) => x.agent_key === agentKey) ?? null
}

function agentNameForKey(agents: MissionAgent[], agentKey: string | null): string {
  const a = agentForKey(agents, agentKey)
  return a?.name ?? (agentKey || 'You / Studio')
}

function formatMessageDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

function AgentAvatarInline({
  agents,
  agentKey,
}: {
  agents: MissionAgent[]
  agentKey: string | null
}) {
  const agent = agentForKey(agents, agentKey)
  if (!agent) return null
  return (
    <span className="mr-1.5 h-spacing-5 w-spacing-5 inline-block shrink-0 overflow-hidden rounded-full border border-border bg-surface-subtle align-middle">
      {agent.image_url ? (
        <img src={agent.image_url} alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <span className="body-4 text-muted-foreground flex h-full w-full items-center justify-center font-bold uppercase">
          {agent.name.slice(0, 1)}
        </span>
      )}
    </span>
  )
}

export function mapAllChatsDocRows(items: ConversationAssetFeedItem[]): AllChatsDocRow[] {
  return items
    .map((item) => {
      const doc = item.document as ConversationDocument | undefined
      if (!doc) return null
      const conversation: Conversation = {
        id: String(item.conversation_id ?? doc.conversation_id),
        user_id: '',
        campaign_id: doc.campaign_id ?? null,
        title: (item.conversation_title as string | null) ?? null,
        agent_id: (item.agent_id as string | null) ?? null,
        status: 'active',
        metadata: {},
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }
      return { id: String(item.id ?? doc.id), doc, conversation }
    })
    .filter((row): row is AllChatsDocRow => row !== null)
}

export function mapAllChatsLinkRows(items: ConversationAssetFeedItem[]): AllChatsLinkRow[] {
  return items.map((item) => ({
    id: String(item.id),
    url: String(item.url ?? ''),
    title: String(item.title ?? item.url ?? 'Link'),
    messageId: String(item.message_id ?? ''),
    messageSnippet: String(item.message_snippet ?? ''),
    conversationId: String(item.conversation_id),
    agentKey: String(item.agent_id ?? ''),
    createdAt: String(item.created_at),
  }))
}

export function mapAllChatsMediaRows(items: ConversationAssetFeedItem[]): AllChatsMediaRow[] {
  return items.map((item) => ({
    id: String(item.id),
    kind: item.media_kind === 'video' ? 'video' : 'image',
    url: String(item.url ?? ''),
    conversationId: String(item.conversation_id),
    agentKey: String(item.agent_id ?? ''),
    messageId: String(item.message_id ?? ''),
    createdAt: String(item.created_at),
  }))
}

export function ArtifactDocumentFeed({
  rows,
  agents,
  onOpen,
}: {
  rows: AllChatsDocRow[]
  agents: MissionAgent[]
  onOpen: (doc: ConversationDocument, conversationId: string, agentKey: string) => void
}) {
  if (rows.length === 0) return <p className="body-3 text-muted-foreground">Nothing here yet.</p>
  return (
    <ul className="space-y-spacing-3">
      {rows.map(({ doc, conversation }) => {
        const agentKey = conversation.agent_id ?? ''
        const chatTitle = conversation.title?.trim() || 'Chat'
        const agentName = agentNameForKey(agents, agentKey || null)
        const contextLine = `${chatTitle} - ${agentName}`
        return (
          <li key={`${conversation.id}-${doc.id}`} className="relative">
            <ConversationArtifactPreviewCard
              doc={doc}
              contextLine={contextLine}
              onOpen={() => onOpen(doc, conversation.id, agentKey)}
            />
          </li>
        )
      })}
    </ul>
  )
}

function openUrlInNewTab(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function LinksTable({
  rows,
  agents,
  onGoTo,
}: {
  rows: AllChatsLinkRow[]
  agents: MissionAgent[]
  onGoTo: (conversationId: string, messageId: string, agentKey: string) => void
}) {
  if (rows.length === 0) return <p className="body-3 text-muted-foreground">Nothing here yet.</p>
  return (
    <table className="body-3 w-full border-separate border-spacing-0 text-left">
      <thead>
        <tr className="text-muted-foreground border-b border-border">
          <th className="surface-card sticky top-0 z-20 border-b border-border pb-2 pr-2 pt-0 text-left">
            Link
          </th>
          <th className="surface-card pr-spacing-4 sticky top-0 z-20 border-b border-border pb-2 pt-0 text-left">
            Message
          </th>
          <th className="surface-card pl-spacing-6 sticky top-0 z-20 border-b border-border pb-2 pr-2 pt-0 text-left">
            Chat
          </th>
          <th className="surface-card sticky top-0 z-20 w-8 border-b border-border pb-2 pt-0"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="hover:bg-hover-subtle border-b border-border">
            <td
              className="cursor-pointer py-2 pr-2 align-top"
              role="button"
              tabIndex={0}
              onClick={() => openUrlInNewTab(row.url)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openUrlInNewTab(row.url)
                }
              }}
            >
              <span className="text-status-emerald font-medium hover:underline">{row.title}</span>
              <div className="body-4 text-muted-foreground max-w-full truncate">{row.url}</div>
            </td>
            <td
              className="text-muted-foreground pr-spacing-4 max-w-full cursor-pointer py-2 align-top"
              role="button"
              tabIndex={0}
              onClick={() => onGoTo(row.conversationId, row.messageId, row.agentKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onGoTo(row.conversationId, row.messageId, row.agentKey)
                }
              }}
            >
              <p className="line-clamp-2 break-words hover:underline">
                {row.messageSnippet || '-'}
              </p>
            </td>
            <td className="pl-spacing-6 py-2 pr-2 align-top">
              <div className="flex items-center">
                <AgentAvatarInline agents={agents} agentKey={row.agentKey || null} />
                <span>{agentNameForKey(agents, row.agentKey || null)}</span>
              </div>
              <div className="body-4 text-muted-foreground">
                {formatMessageDateTime(row.createdAt)}
              </div>
            </td>
            <td className="py-2 align-top">
              <button
                type="button"
                onClick={() => openUrlInNewTab(row.url)}
                className="btn-icon-glass btn-icon-glass-sm"
                aria-label="Open link"
                title="Open link"
              >
                <ExternalLink className="icon-xs" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function MediaGrid({
  rows,
  agents,
  onGoTo,
}: {
  rows: AllChatsMediaRow[]
  agents: MissionAgent[]
  onGoTo: (conversationId: string, messageId: string, agentKey: string) => void
}) {
  if (rows.length === 0) return <p className="body-3 text-muted-foreground">Nothing here yet.</p>
  return (
    <div className="gap-spacing-3 grid grid-cols-2 sm:grid-cols-4">
      {rows.map((row) => (
        <div key={row.id} className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => window.open(row.url, '_blank', 'noopener,noreferrer')}
            className="rounded-spacing-2 bg-surface-subtle relative aspect-square overflow-hidden border border-border"
          >
            <ChatMediaTile
              kind={row.kind}
              url={row.url}
              alt={row.kind === 'video' ? 'Video' : ''}
            />
          </button>
          <div className="flex items-center gap-1">
            <AgentAvatarInline agents={agents} agentKey={row.agentKey || null} />
            <p className="body-4 text-muted-foreground truncate">
              {agentNameForKey(agents, row.agentKey || null)}
            </p>
          </div>
          <button
            type="button"
            className="body-4 text-status-emerald text-left hover:underline"
            onClick={() => onGoTo(row.conversationId, row.messageId, row.agentKey)}
          >
            Go to message
          </button>
        </div>
      ))}
    </div>
  )
}
