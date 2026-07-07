'use client'

import { CheckCircle2, Link2, Mail } from 'lucide-react'
import { buildContactConversationChatDragPayload } from '../../lib/contact-conversation-drag'
import type {
  ContactConversationItem,
  ContactEmailTimelineItem,
} from '../../services/contact-communications.service'
import { SentEmailHtmlHost } from './ContactCommunicationEmailBody'
import { formatRelativeTime } from './ContactCommunicationPanel.helpers'
import {
  ContactConversationAgentAvatar,
  conversationChannelBadge,
} from './ContactConversationThread'

export interface ContactCommunicationTimelineItem {
  kind: 'email' | 'conversation'
  id: string
  timestamp: string
  isSuggestedConversation: boolean
  email?: ContactEmailTimelineItem
  conversation?: ContactConversationItem
}

interface ContactCommunicationTimelineProps {
  expandedKeys: Set<string>
  items: ContactCommunicationTimelineItem[]
  linkingConversationId: string | null
  loading: boolean
  onEnsureEmailBody: (email: ContactEmailTimelineItem) => void
  onLinkConversation: (conversation: ContactConversationItem) => void
  onOpenThread: (conversation: ContactConversationItem) => void
  onToggleExpand: (key: string) => void
}

export function ContactCommunicationTimeline({
  expandedKeys,
  items,
  linkingConversationId,
  loading,
  onEnsureEmailBody,
  onLinkConversation,
  onOpenThread,
  onToggleExpand,
}: ContactCommunicationTimelineProps) {
  return (
    <div className="px-spacing-4 py-spacing-3 min-h-0 flex-1 overflow-y-auto">
      {loading ? (
        <p className="body-3 text-muted-foreground text-center">Loading communications...</p>
      ) : items.length === 0 ? (
        <p className="body-3 text-muted-foreground text-center">No communication yet</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const key = `${item.kind}:${item.id}`
            const isExpanded = expandedKeys.has(key)
            if (item.kind === 'email' && item.email) {
              return (
                <ContactCommunicationEmailRow
                  key={key}
                  email={item.email}
                  isExpanded={isExpanded}
                  onEnsureBody={onEnsureEmailBody}
                  onToggle={() => onToggleExpand(key)}
                />
              )
            }

            const conversation = item.conversation
            if (!conversation) return null
            return (
              <ContactCommunicationConversationRow
                key={key}
                conversation={conversation}
                isExpanded={isExpanded}
                isSuggested={item.isSuggestedConversation}
                linkingConversationId={linkingConversationId}
                onLinkConversation={onLinkConversation}
                onOpenThread={onOpenThread}
                onToggle={() => onToggleExpand(key)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function ContactCommunicationEmailRow({
  email,
  isExpanded,
  onEnsureBody,
  onToggle,
}: {
  email: ContactEmailTimelineItem
  isExpanded: boolean
  onEnsureBody: (email: ContactEmailTimelineItem) => void
  onToggle: () => void
}) {
  return (
    <div className="card-glass rounded-spacing-2 min-w-0 overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (!isExpanded) onEnsureBody(email)
          onToggle()
        }}
        className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-hover-subtle"
      >
        <span className="bg-hover-subtle text-muted-foreground mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
          <Mail className="icon-sm" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="body-3 text-foreground block truncate font-medium">
            {email.subject || 'Untitled email'}
          </span>
          <span className="body-4 text-muted-foreground mt-1 block">
            {formatRelativeTime(email.sent_at ?? email.created_at)}
          </span>
        </span>
        <span className="badge-glass badge-glass-blue body-4 rounded-spacing-2 mt-0.5 inline-flex shrink-0 items-center px-2 py-1 capitalize">
          {email.status}
        </span>
      </button>
      {isExpanded ? <ContactCommunicationEmailDetails email={email} /> : null}
    </div>
  )
}

function ContactCommunicationEmailDetails({ email }: { email: ContactEmailTimelineItem }) {
  return (
    <div className="space-y-2 px-3 pb-3 pt-1">
      {email.html_body == null ? (
        <p className="body-4 text-muted-foreground">Loading message...</p>
      ) : (
        <SentEmailHtmlHost emailId={email.id} html={email.html_body} />
      )}
      <div className="space-y-1">
        {(email.events ?? []).length === 0 ? (
          <p className="body-4 text-muted-foreground">No engagement events</p>
        ) : (
          email.events.map((event) => (
            <div key={event.id} className="flex items-center justify-between text-xs">
              <span className="text-foreground capitalize">{event.event_type}</span>
              <span className="text-muted-foreground">
                {formatRelativeTime(event.timestamp ?? event.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ContactCommunicationConversationRow({
  conversation,
  isExpanded,
  isSuggested,
  linkingConversationId,
  onLinkConversation,
  onOpenThread,
  onToggle,
}: {
  conversation: ContactConversationItem
  isExpanded: boolean
  isSuggested: boolean
  linkingConversationId: string | null
  onLinkConversation: (conversation: ContactConversationItem) => void
  onOpenThread: (conversation: ContactConversationItem) => void
  onToggle: () => void
}) {
  const preview = conversation.preview_messages?.[0]
  const badge = conversationChannelBadge(conversation.channel)

  return (
    <div
      className="border-comms-inner rounded-lg bg-background"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'application/x-vibey-artifact',
          JSON.stringify(buildContactConversationChatDragPayload(conversation)),
        )
        e.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <button
        type="button"
        onClick={() => (isSuggested ? onToggle() : onOpenThread(conversation))}
        className="flex w-full items-start gap-2 px-3 py-2 text-left"
      >
        <span className="mt-0.5 shrink-0">
          <ContactConversationAgentAvatar conversation={conversation} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="body-3 text-foreground block truncate font-medium">
            {conversation.title || 'Agent conversation'}
            {conversation.agent_name ? (
              <span className="text-muted-foreground"> &middot; {conversation.agent_name}</span>
            ) : null}
          </span>
          <span className="body-4 text-muted-foreground mt-0.5 block truncate">
            {preview?.content || 'No messages yet'}
          </span>
          <span className="body-4 text-muted-foreground mt-1 block">
            {formatRelativeTime(conversation.updated_at ?? conversation.created_at)}
          </span>
        </span>
        <span
          className={`badge-glass ${badge.badgeClass} body-4 rounded-spacing-2 mt-0.5 inline-flex shrink-0 items-center px-2 py-1`}
        >
          {badge.label}
        </span>
        {isSuggested ? (
          <span className="badge-glass badge-glass-blue body-4 rounded-spacing-2 mt-0.5 inline-flex shrink-0 items-center px-2 py-1">
            Suggested
          </span>
        ) : null}
      </button>
      {isExpanded ? (
        <ContactCommunicationConversationDetails
          conversation={conversation}
          linkingConversationId={linkingConversationId}
          onLinkConversation={onLinkConversation}
          showLinkButton={isSuggested}
        />
      ) : null}
    </div>
  )
}

function ContactCommunicationConversationDetails({
  conversation,
  linkingConversationId,
  onLinkConversation,
  showLinkButton,
}: {
  conversation: ContactConversationItem
  linkingConversationId: string | null
  onLinkConversation: (conversation: ContactConversationItem) => void
  showLinkButton: boolean
}) {
  return (
    <div className="border-comms-inner-t space-y-2 px-3 py-2">
      {(conversation.preview_messages ?? []).length === 0 ? (
        <p className="body-4 text-muted-foreground">No preview messages</p>
      ) : (
        <div className="space-y-1">
          {conversation.preview_messages.map((msg) => (
            <div key={msg.id} className="border-comms-inner rounded-md px-2 py-1.5">
              <p className="body-4 text-muted-foreground capitalize">{msg.role}</p>
              <p className="body-3 text-foreground mt-0.5 whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
        </div>
      )}

      {showLinkButton ? (
        <button
          type="button"
          disabled={linkingConversationId === conversation.id}
          onClick={() => onLinkConversation(conversation)}
          className="button-glass-neutral inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-40"
        >
          {linkingConversationId === conversation.id ? (
            <>
              <CheckCircle2 className="icon-sm" />
              Linking...
            </>
          ) : (
            <>
              <Link2 className="icon-sm" />
              Link to this contact
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}
