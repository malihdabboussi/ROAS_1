'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { Contact } from '@/lib/contacts/contacts-api'
import { useCustomFields } from '@/lib/properties/use-custom-fields'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  fetchContactConversations,
  fetchContactEmail,
  fetchContactEmails,
  linkConversationToContact,
  sendContactEmail,
  type ContactConversationItem,
  type ContactEmailTimelineItem,
} from '../../services/contact-communications.service'
import {
  buildContactMergeFieldRows,
  expandContactMergeTokens,
} from '../../utils/contact-merge-fields'
import { ContactCommunicationComposer } from './ContactCommunicationComposer'
import {
  ContactCommunicationTimeline,
  type ContactCommunicationTimelineItem,
} from './ContactCommunicationTimeline'
import { ContactConversationThread } from './ContactConversationThread'
import {
  htmlToPlainText,
  mergeEmailBodies,
} from './ContactCommunicationPanel.helpers'

export type ContactCommunicationTab = 'all' | 'emails' | 'agent'

/**
 * Per-contact snapshot (pattern 3 companion): the panel stays mounted across
 * contact switches, so switching back paints the last known timeline
 * instantly while the background refetch revalidates.
 */
interface ContactCommsSnapshot {
  emails: ContactEmailTimelineItem[]
  conversations: ContactConversationItem[]
  suggested: ContactConversationItem[]
}
const contactCommsCache = new Map<string, ContactCommsSnapshot>()

interface ContactCommunicationPanelProps {
  contactId: string
  contact: Contact
  communicationTab: ContactCommunicationTab
  onLoaded?: () => void
}

export function ContactCommunicationPanel({
  contactId,
  contact,
  communicationTab: tab,
  onLoaded,
}: ContactCommunicationPanelProps) {
  const { fields: customFieldDefinitions } = useCustomFields()
  const initialSnapshot = contactCommsCache.get(contactId)
  const [emails, setEmails] = useState<ContactEmailTimelineItem[]>(
    () => initialSnapshot?.emails ?? [],
  )
  const [conversations, setConversations] = useState<ContactConversationItem[]>(
    () => initialSnapshot?.conversations ?? [],
  )
  const [suggestedConversations, setSuggestedConversations] = useState<ContactConversationItem[]>(
    () => initialSnapshot?.suggested ?? [],
  )
  const [loading, setLoading] = useState(() => !contactCommsCache.has(contactId))
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [draft, setDraft] = useState('<p></p>')
  const [sending, setSending] = useState(false)
  const [linkingConversationId, setLinkingConversationId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [openThread, setOpenThread] = useState<ContactConversationItem | null>(null)

  useEffect(() => {
    setOpenThread(null)
  }, [contactId])

  /** The contact the current state belongs to — guards in-flight responses after a switch. */
  const activeContactIdRef = useRef(contactId)
  const bodyFetchInFlightRef = useRef<Set<string>>(new Set())

  // Contact switch (panel stays mounted): restore that contact's snapshot or
  // clear, and reset per-contact transient UI state.
  useEffect(() => {
    if (activeContactIdRef.current === contactId) return
    activeContactIdRef.current = contactId
    const cached = contactCommsCache.get(contactId)
    setEmails(cached?.emails ?? [])
    setConversations(cached?.conversations ?? [])
    setSuggestedConversations(cached?.suggested ?? [])
    setLoading(!cached)
    setExpandedKeys(new Set())
    setSubject('')
    setDraft('<p></p>')
    setComposerOpen(false)
  }, [contactId])

  const load = useCallback(async () => {
    const id = contactId
    try {
      const [emailsRes, conversationsRes] = await Promise.all([
        fetchContactEmails(id, { limit: 50, offset: 0, summary: true }),
        fetchContactConversations(id, { limit: 50, offset: 0 }),
      ])
      if (activeContactIdRef.current !== id) return
      setEmails((prev) => mergeEmailBodies(prev, emailsRes.emails ?? []))
      setConversations(conversationsRes.conversations ?? [])
      setSuggestedConversations(conversationsRes.suggested_conversations ?? [])
    } finally {
      if (activeContactIdRef.current === id) {
        setLoading(false)
        onLoaded?.()
      }
    }
  }, [contactId, onLoaded])

  useEffect(() => {
    void load()
  }, [load])

  // Keep the per-contact snapshot in sync with settled state (covers loads,
  // sends, links, and lazily fetched email bodies).
  useEffect(() => {
    if (loading || activeContactIdRef.current !== contactId) return
    contactCommsCache.set(contactId, {
      emails,
      conversations,
      suggested: suggestedConversations,
    })
  }, [contactId, emails, conversations, suggestedConversations, loading])

  /** Summary list omits html_body; fetch it once when a card is expanded. */
  const ensureEmailBody = useCallback(
    (email: ContactEmailTimelineItem) => {
      if (email.html_body != null) return
      if (bodyFetchInFlightRef.current.has(email.id)) return
      bodyFetchInFlightRef.current.add(email.id)
      const id = contactId
      fetchContactEmail(id, email.id)
        .then((res) => {
          if (activeContactIdRef.current !== id) return
          setEmails((prev) =>
            prev.map((e) =>
              e.id === email.id ? { ...e, html_body: res.email.html_body ?? '' } : e,
            ),
          )
        })
        .catch(() => {
          /* expand shows "No body"; retried on next expand */
        })
        .finally(() => {
          bodyFetchInFlightRef.current.delete(email.id)
        })
    },
    [contactId],
  )

  const timelineItems = useMemo<ContactCommunicationTimelineItem[]>(() => {
    const all: ContactCommunicationTimelineItem[] = [
      ...emails.map((email) => ({
        kind: 'email' as const,
        id: email.id,
        timestamp: email.sent_at ?? email.created_at,
        email,
        isSuggestedConversation: false,
      })),
      ...conversations.map((conversation) => ({
        kind: 'conversation' as const,
        id: conversation.id,
        timestamp: conversation.updated_at ?? conversation.created_at,
        conversation,
        isSuggestedConversation: false,
      })),
      ...suggestedConversations.map((conversation) => ({
        kind: 'conversation' as const,
        id: conversation.id,
        timestamp: conversation.updated_at ?? conversation.created_at,
        conversation,
        isSuggestedConversation: true,
      })),
    ]

    const filtered = all.filter((item) => {
      if (tab === 'all') return true
      if (tab === 'emails') return item.kind === 'email'
      return item.kind === 'conversation'
    })
    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
  }, [emails, conversations, suggestedConversations, tab])

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const mergeFields = useMemo(
    () => buildContactMergeFieldRows(contact, customFieldDefinitions),
    [contact, customFieldDefinitions],
  )

  const handleSend = useCallback(async () => {
    const plainBody = htmlToPlainText(draft)
    if (!plainBody || sending) return

    const trimmedSubject = subject.trim()
    if (!trimmedSubject) {
      toast.error('Subject is required')
      return
    }
    setSending(true)
    try {
      const subjectOut = expandContactMergeTokens(trimmedSubject, contact, customFieldDefinitions)
      const bodyOut = expandContactMergeTokens(draft, contact, customFieldDefinitions)
      const res = await sendContactEmail(contactId, { subject: subjectOut, body: bodyOut })
      setEmails((prev) => [res.email, ...prev])
      setDraft('<p></p>')
      setSubject('')
      toast.success('Email sent')
    } catch (error) {
      toast.error(sanitizeUserError(error, 'Failed to send email'))
    } finally {
      setSending(false)
    }
  }, [contactId, contact, customFieldDefinitions, draft, sending, subject])

  const handleLinkConversation = useCallback(
    async (conversation: ContactConversationItem) => {
      if (linkingConversationId) return
      setLinkingConversationId(conversation.id)
      try {
        await linkConversationToContact(contactId, conversation.id)
        setSuggestedConversations((prev) => prev.filter((c) => c.id !== conversation.id))
        setConversations((prev) => {
          if (prev.some((c) => c.id === conversation.id)) return prev
          return [conversation, ...prev]
        })
        toast.success('Conversation linked')
      } catch (error) {
        toast.error(sanitizeUserError(error, 'Failed to link conversation'))
      } finally {
        setLinkingConversationId(null)
      }
    },
    [contactId, linkingConversationId],
  )

  if (openThread) {
    return (
      <ContactConversationThread conversation={openThread} onBack={() => setOpenThread(null)} />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ContactCommunicationTimeline
        expandedKeys={expandedKeys}
        items={timelineItems}
        linkingConversationId={linkingConversationId}
        loading={loading}
        onEnsureEmailBody={ensureEmailBody}
        onLinkConversation={(conversation) => void handleLinkConversation(conversation)}
        onOpenThread={setOpenThread}
        onToggleExpand={toggleExpand}
      />

      <ContactCommunicationComposer
        composerOpen={composerOpen}
        subject={subject}
        draft={draft}
        sending={sending}
        mergeFields={mergeFields}
        onDraftChange={setDraft}
        onSend={() => void handleSend()}
        onSubjectChange={setSubject}
        onToggleComposer={() => setComposerOpen((v) => !v)}
      />
    </div>
  )
}
