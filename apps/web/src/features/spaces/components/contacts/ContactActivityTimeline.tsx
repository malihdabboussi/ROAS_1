'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  Globe,
  Megaphone,
  MessagesSquare,
  Mic,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Square,
  Trash2,
  User,
} from 'lucide-react'
import { SimpleChatAudioRecorder } from '@/components/ui/media/simple-chat-audio-recorder'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import {
  addContactNote,
  fetchContactActivity,
  updateContactNote,
  type ContactActivityEvent,
} from '../../services/contacts-view.service'
import { ReportingTimeRangeSelector } from '../reporting/shared/ReportingTimeRangeSelector'
import {
  resolveReportingDates,
  type ReportingDateRangeInput,
} from '../reporting/shared/resolve-reporting-dates'
import {
  contactNoteCardSurface,
  notePayloadCardTint,
  type NoteCardTintId,
} from './contact-note-card-tint'
import { NoteColorPicker } from './note-color-picker'

interface ContactActivityTimelineProps {
  contactId: string
  refreshKey?: number
}

/**
 * Per-contact snapshot (pattern 3 companion): the timeline stays mounted
 * across contact switches; restoring the last known events paints instantly
 * while the background refetch (slowest detail endpoint) revalidates.
 */
const contactActivityCache = new Map<string, ContactActivityEvent[]>()

const CONTACT_FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  email: 'Email',
  tags: 'Tags',
  custom_fields: 'Custom fields',
  source: 'Source',
  business_name: 'Business name',
  website: 'Website',
  address: 'Address',
  city: 'City',
  state: 'State',
  country: 'Country',
  contact_type: 'Contact type',
  contact_source: 'Contact source',
}

const ACTIVITY_FILTER_OPTIONS: { id: ContactActivityEvent['event_type']; label: string }[] = [
  { id: 'note_added', label: 'Notes' },
  { id: 'field_change', label: 'Field updates' },
  { id: 'funnel_submission', label: 'Funnel' },
  { id: 'campaign_joined', label: 'Campaign' },
  { id: 'conversation_started', label: 'Conversations' },
  { id: 'conversation_message_activity', label: 'Messages' },
  { id: 'contact_created', label: 'Created' },
]

const ALL_ACTIVITY_TYPE_IDS = new Set(ACTIVITY_FILTER_OPTIONS.map((o) => o.id))

function eventActorAvatarUrl(ev: ContactActivityEvent): string | null {
  const u = ev.payload.avatar_url
  return typeof u === 'string' && u.trim().length > 0 ? u.trim() : null
}

function resolveActorMeta(
  ev: ContactActivityEvent,
  currentUserId: string | null,
  authDisplayName: string,
): { label: string; senderLabel: string } {
  const raw =
    typeof ev.payload.display_name === 'string' && ev.payload.display_name.trim().length > 0
      ? ev.payload.display_name.trim()
      : null
  const uid = ev.user_id ?? null
  const isMe = currentUserId != null && uid != null && uid === currentUserId
  const name =
    raw ?? (isMe && authDisplayName.trim().length > 0 ? authDisplayName.trim() : null) ?? 'Member'
  return {
    label: isMe ? 'You' : name,
    senderLabel: name,
  }
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fieldChangePhrase(payload: Record<string, unknown>): string {
  const fieldId = String(payload.field ?? '')
  const label =
    CONTACT_FIELD_LABELS[fieldId] ??
    fieldId.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return `updated ${label}`
}

function conversationChannelLabel(payload: Record<string, unknown>): string {
  if (payload.channel === 'telegram') return 'Telegram'
  if (payload.channel === 'widget') return 'the website widget'
  return 'agent chat'
}

function eventLabelPlain(ev: ContactActivityEvent): string {
  switch (ev.event_type) {
    case 'funnel_submission': {
      const title = ev.payload.funnel_title as string | null
      return title ? `Submitted via ${title}` : 'Funnel submission'
    }
    case 'campaign_joined': {
      const title = ev.payload.campaign_title as string | null
      return title ? `Joined campaign: ${title}` : 'Joined campaign'
    }
    case 'contact_created':
      return 'Contact created'
    case 'conversation_started': {
      const agent = ev.payload.agent_name as string | null
      return `Started a conversation on ${conversationChannelLabel(ev.payload)}${agent ? ` with ${agent}` : ''}`
    }
    case 'conversation_message_activity': {
      const count = Number(ev.payload.message_count ?? 0)
      return `${count} message${count === 1 ? '' : 's'} on ${conversationChannelLabel(ev.payload)}`
    }
    default:
      return ev.event_type
  }
}

function eventDotClass(type: string): string {
  switch (type) {
    case 'funnel_submission':
      return 'text-blue-400'
    case 'campaign_joined':
      return 'text-orange-400'
    case 'note_added':
      return 'text-emerald-400'
    case 'field_change':
      return 'text-violet-400'
    case 'contact_created':
      return 'text-[var(--color-muted-foreground)]'
    case 'conversation_started':
    case 'conversation_message_activity':
      return 'text-sky-400'
    default:
      return 'text-[var(--color-muted-foreground)]'
  }
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case 'funnel_submission':
      return <Globe className="h-3.5 w-3.5" />
    case 'campaign_joined':
      return <Megaphone className="h-3.5 w-3.5" />
    case 'note_added':
      return <User className="h-3.5 w-3.5" />
    case 'field_change':
      return <User className="h-3.5 w-3.5" />
    case 'contact_created':
      return <User className="h-3.5 w-3.5" />
    case 'conversation_started':
    case 'conversation_message_activity':
      return <MessagesSquare className="h-3.5 w-3.5" />
    default:
      return <Plus className="h-3.5 w-3.5" />
  }
}

function eventDayInRange(iso: string, start: string | undefined, end: string | undefined): boolean {
  if (!start && !end) return true
  const day = iso.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const effectiveEnd = end ?? (start ? today : undefined)
  if (start && day < start) return false
  if (effectiveEnd && day > effectiveEnd) return false
  return true
}

function buildEventSearchText(
  ev: ContactActivityEvent,
  currentUserId: string | null,
  authDisplayName: string,
): string {
  const parts: string[] = [ev.event_type]
  switch (ev.event_type) {
    case 'note_added':
      parts.push(String(ev.payload.content ?? ''))
      break
    case 'field_change':
      parts.push(String(ev.payload.field ?? ''), fieldChangePhrase(ev.payload))
      break
    case 'funnel_submission':
      parts.push(String(ev.payload.funnel_title ?? ''), String(ev.payload.source_domain ?? ''))
      break
    case 'campaign_joined':
      parts.push(String(ev.payload.campaign_title ?? ''))
      break
    case 'conversation_started':
    case 'conversation_message_activity':
      parts.push(
        String(ev.payload.channel ?? ''),
        String(ev.payload.agent_name ?? ''),
        String(ev.payload.title ?? ''),
      )
      break
    default:
      break
  }
  if (ev.event_type === 'note_added' || ev.event_type === 'field_change') {
    const meta = resolveActorMeta(ev, currentUserId, authDisplayName)
    parts.push(meta.senderLabel, meta.label)
  }
  parts.push(eventLabelPlain(ev))
  return parts.join(' ')
}

function NoteCard({
  ev,
  meta,
  contactId,
  currentUserId,
  onUpdated,
}: {
  ev: ContactActivityEvent
  meta: { label: string; senderLabel: string }
  contactId: string
  currentUserId: string | null
  onUpdated: (noteId: string, patch: Record<string, unknown>) => void
}) {
  const surface = contactNoteCardSurface(notePayloadCardTint(ev.payload))
  const realNoteId = ev.id.startsWith('note_') ? ev.id.slice(5) : ev.id
  const isAuthor = currentUserId != null && ev.user_id === currentUserId
  const canEdit = isAuthor

  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState((ev.payload.content as string) || '')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      setEditText((ev.payload.content as string) || '')
      setTimeout(() => textareaRef.current?.focus(), 30)
    }
  }, [editing, ev.payload.content])

  const handleSaveEdit = useCallback(async () => {
    const trimmed = editText.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await updateContactNote(contactId, realNoteId, { content: trimmed })
      onUpdated(realNoteId, { content: trimmed })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }, [contactId, realNoteId, editText, saving, onUpdated])

  const handleColorChange = useCallback(
    async (next: NoteCardTintId | null) => {
      try {
        await updateContactNote(contactId, realNoteId, { card_tint: next })
        onUpdated(realNoteId, { card_tint: next })
      } catch {
        /* silent */
      }
    },
    [contactId, realNoteId, onUpdated],
  )

  return (
    <div className={cn('group/note relative', surface.className)} style={surface.style}>
      <div className="px-spacing-3 py-spacing-2">
        <div className="flex items-start justify-between gap-2">
          <div className="gap-spacing-1 flex min-w-0 flex-wrap items-center">
            <span className="body-3 font-medium text-[var(--foreground)]">{meta.label}</span>
            <span className="body-3 text-[var(--color-muted-foreground)]">left a note</span>
          </div>
          <span className="body-4 shrink-0 text-[var(--color-muted-foreground)] transition-opacity duration-150 group-hover/note:opacity-0">
            {formatRelativeTime(ev.created_at)}
          </span>
        </div>
        {editing ? (
          <div className="mt-spacing-1 space-y-1.5">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSaveEdit()
                }
                if (e.key === 'Escape') setEditing(false)
              }}
              rows={2}
              className="body-3 w-full resize-none bg-transparent text-[var(--foreground)] outline-none"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!editText.trim() || saving}
                onClick={() => void handleSaveEdit()}
                className="chip-glass-green rounded-md px-2 py-0.5 text-[10px] font-medium disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md px-2 py-0.5 text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="body-3 mt-spacing-1 whitespace-pre-wrap leading-snug text-[var(--foreground)]">
            {(ev.payload.content as string) || ''}
          </p>
        )}
      </div>

      {canEdit && !editing && (
        <div className="pointer-events-none absolute right-1.5 top-1.5 flex translate-x-2 items-center gap-0.5 opacity-0 transition-all duration-150 ease-out group-hover/note:pointer-events-auto group-hover/note:translate-x-0 group-hover/note:opacity-100">
          <Tooltip label="Edit note">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="button-glass-neutral flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </Tooltip>
          <NoteColorPicker
            value={notePayloadCardTint(ev.payload) as NoteCardTintId | null}
            onChange={handleColorChange}
            variant="icon"
            placement="up"
            className="!h-6 !w-6"
          />
        </div>
      )}
    </div>
  )
}

export function ContactActivityTimeline({
  contactId,
  refreshKey = 0,
}: ContactActivityTimelineProps) {
  const [events, setEvents] = useState<ContactActivityEvent[]>(
    () => contactActivityCache.get(contactId) ?? [],
  )
  const [loading, setLoading] = useState(() => !contactActivityCache.has(contactId))
  const [noteText, setNoteText] = useState('')
  const [noteCardTint, setNoteCardTint] = useState<NoteCardTintId | null>(null)
  const [sending, setSending] = useState(false)
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'finishing'>('idle')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [activitySearchOpen, setActivitySearchOpen] = useState(false)
  const [activitySearch, setActivitySearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<Set<ContactActivityEvent['event_type']>>(
    () => new Set(ALL_ACTIVITY_TYPE_IDS),
  )
  const [dateConfig, setDateConfig] = useState<ReportingDateRangeInput>({ time_range: 'all' })
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const [filterDropdownPos, setFilterDropdownPos] = useState<{ top: number; left: number } | null>(
    null,
  )

  const endRef = useRef<HTMLDivElement>(null)
  const notePrefixBeforeRecordingRef = useRef('')
  const initialScrollDone = useRef(false)

  const isDateFilterAll =
    !dateConfig.custom_start && !dateConfig.custom_end && (dateConfig.time_range ?? 'all') === 'all'

  const typeFilterActive = typeFilter.size < ALL_ACTIVITY_TYPE_IDS.size

  const dockPinned =
    activitySearchOpen ||
    Boolean(activitySearch.trim()) ||
    filterMenuOpen ||
    !isDateFilterAll ||
    typeFilterActive

  const { startDate: rangeStart, endDate: rangeEnd } = useMemo(
    () => resolveReportingDates(dateConfig),
    [dateConfig],
  )

  const filteredEvents = useMemo(() => {
    let list = events
    const q = activitySearch.trim().toLowerCase()
    if (q) {
      list = list.filter((ev) =>
        buildEventSearchText(ev, currentUserId, authDisplayName).toLowerCase().includes(q),
      )
    }
    if (typeFilter.size < ALL_ACTIVITY_TYPE_IDS.size) {
      list = list.filter((ev) => typeFilter.has(ev.event_type))
    }
    if (rangeStart || rangeEnd) {
      list = list.filter((ev) => eventDayInRange(ev.created_at, rangeStart, rangeEnd))
    }
    return list
  }, [events, activitySearch, typeFilter, rangeStart, rangeEnd, currentUserId, authDisplayName])

  useLayoutEffect(() => {
    if (!filterMenuOpen || !filterBtnRef.current) {
      setFilterDropdownPos(null)
      return
    }
    const r = filterBtnRef.current.getBoundingClientRect()
    const w = 192
    setFilterDropdownPos({
      top: r.bottom + 4,
      left: Math.max(8, r.right - w),
    })
  }, [filterMenuOpen])

  useEffect(() => {
    if (!filterMenuOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (filterBtnRef.current?.contains(t)) return
      if (filterDropdownRef.current?.contains(t)) return
      setFilterMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [filterMenuOpen])

  useEffect(() => {
    let cancelled = false
    void createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (cancelled || !user) return
        setCurrentUserId(user.id)
        const meta = user.user_metadata as Record<string, unknown> | undefined
        const nameRaw = meta?.full_name ?? meta?.name ?? user.email?.split('@')[0] ?? ''
        setAuthDisplayName(typeof nameRaw === 'string' ? nameRaw : '')
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** The contact the current state belongs to — guards in-flight responses after a switch. */
  const activeContactIdRef = useRef(contactId)

  // Contact switch (timeline stays mounted): restore that contact's snapshot
  // or clear, and reset per-contact transient UI state.
  useEffect(() => {
    if (activeContactIdRef.current === contactId) return
    activeContactIdRef.current = contactId
    const cached = contactActivityCache.get(contactId)
    setEvents(cached ?? [])
    setLoading(!cached)
    setNoteText('')
    setNoteCardTint(null)
    setActivitySearch('')
    setActivitySearchOpen(false)
    setTypeFilter(new Set(ALL_ACTIVITY_TYPE_IDS))
    setDateConfig({ time_range: 'all' })
    initialScrollDone.current = false
  }, [contactId])

  const load = useCallback(async () => {
    const id = contactId
    try {
      const res = await fetchContactActivity(id)
      if (activeContactIdRef.current !== id) return
      contactActivityCache.set(id, res.events)
      setEvents(res.events)
    } finally {
      if (activeContactIdRef.current === id) setLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  // Keep the per-contact snapshot in sync (covers notes added locally and
  // realtime inserts) so switching back shows them instantly.
  useEffect(() => {
    if (loading || activeContactIdRef.current !== contactId) return
    contactActivityCache.set(contactId, events)
  }, [contactId, events, loading])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`contact-activity-${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_activity',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            user_id: string
            event_type: string
            payload: Record<string, unknown>
            created_at: string
          }
          const ev: ContactActivityEvent = {
            id: row.id,
            event_type: row.event_type as ContactActivityEvent['event_type'],
            payload: row.payload ?? {},
            created_at: row.created_at,
            user_id: row.user_id,
          }
          setEvents((prev) => {
            if (prev.some((e) => e.id === ev.id)) return prev
            return [...prev, ev].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            )
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [contactId])

  useEffect(() => {
    if (loading) {
      initialScrollDone.current = false
      return
    }
    if (!initialScrollDone.current) {
      initialScrollDone.current = true
      endRef.current?.scrollIntoView({ behavior: 'instant' })
      return
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredEvents.length, loading, contactId])

  const handleSendNote = useCallback(async () => {
    const text = noteText.trim()
    if (!text || sending || recordingState !== 'idle') return
    setSending(true)
    try {
      const newEvent = await addContactNote(contactId, text, noteCardTint)
      setEvents((prev) => [...prev, newEvent])
      setNoteText('')
      setNoteCardTint(null)
    } finally {
      setSending(false)
    }
  }, [contactId, noteText, noteCardTint, sending, recordingState])

  const toggleTypeInFilter = useCallback((id: ContactActivityEvent['event_type']) => {
    setTypeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) return new Set(ALL_ACTIVITY_TYPE_IDS)
      return next
    })
  }, [])

  const activityToolbarRight = (
    <div
      className={cn(
        'flex min-h-7 items-center justify-end gap-0.5 transition-all duration-150 ease-out',
        dockPinned
          ? 'translate-x-0 opacity-100'
          : 'pointer-events-none translate-x-2 opacity-0 group-hover/activity-section:pointer-events-auto group-hover/activity-section:translate-x-0 group-hover/activity-section:opacity-100',
      )}
    >
      <div className="flex h-7 items-center">
        <AnimatePresence>
          {activitySearchOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 160, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex h-7 items-center overflow-hidden"
            >
              <input
                autoFocus
                type="search"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                onBlur={() => {
                  if (!activitySearch.trim()) setActivitySearchOpen(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setActivitySearch('')
                    setActivitySearchOpen(false)
                  }
                }}
                placeholder="Search…"
                className="h-7 w-full rounded-lg border-[0.5px] border-solid border-[var(--color-border)] bg-[var(--background)] px-2.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
              />
            </motion.div>
          )}
        </AnimatePresence>
        <Tooltip label="Search activity" side="bottom" triggerClassName="flex h-7 items-center">
          <span className="inline-flex h-7 items-center">
            <button
              type="button"
              onClick={() => {
                if (activitySearchOpen && !activitySearch.trim()) setActivitySearchOpen(false)
                else setActivitySearchOpen(true)
              }}
              className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                activitySearchOpen || activitySearch.trim()
                  ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
              )}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </span>
        </Tooltip>
      </div>

      <Tooltip label="Filter by type" side="bottom" triggerClassName="flex h-7 items-center">
        <span className="inline-flex h-7 items-center">
          <button
            ref={filterBtnRef}
            type="button"
            onClick={() => setFilterMenuOpen((o) => !o)}
            className={cn(
              'inline-flex h-7 shrink-0 items-center justify-center rounded-md transition-colors',
              typeFilterActive || filterMenuOpen
                ? 'badge-glass badge-glass-blue body-3 rounded-spacing-2 gap-1 px-2.5 py-1 text-xs font-medium'
                : 'h-7 w-7 text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
            )}
            aria-expanded={filterMenuOpen}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            {typeFilterActive ? (
              <ChevronDown
                className={cn(
                  'h-3 w-3 shrink-0 opacity-70 transition-transform',
                  filterMenuOpen && 'rotate-180',
                )}
              />
            ) : null}
          </button>
        </span>
      </Tooltip>

      <ReportingTimeRangeSelector
        variant="badge"
        config={dateConfig}
        onConfigPatch={(patch) => setDateConfig((prev) => ({ ...prev, ...patch }))}
      />
    </div>
  )

  if (loading && events.length === 0) {
    return (
      <div className="group/activity-section flex h-full min-h-0 flex-col overflow-hidden">
        <div className="px-spacing-6 py-spacing-3 flex shrink-0 items-center justify-between gap-2">
          <h3 className="body-3 min-w-0 shrink font-semibold text-[var(--color-foreground)]">
            Activity
          </h3>
          {activityToolbarRight}
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <VibeyLoadingOrb text="Loading activity..." state="processing" size="sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="group/activity-section flex h-full min-h-0 flex-col overflow-hidden">
      {filterMenuOpen && filterDropdownPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={filterDropdownRef}
              className="dropdown-menu-solid fixed z-[100001] w-48 rounded-xl py-1 shadow-lg"
              style={{ top: filterDropdownPos.top, left: filterDropdownPos.left }}
              role="menu"
            >
              {ACTIVITY_FILTER_OPTIONS.map((opt) => {
                const on = typeFilter.has(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                    onClick={() => toggleTypeInFilter(opt.id)}
                  >
                    <span
                      className={
                        on
                          ? 'font-medium text-[var(--foreground)]'
                          : 'text-[var(--color-muted-foreground)]'
                      }
                    >
                      {opt.label}
                    </span>
                    {on ? <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" /> : null}
                  </button>
                )
              })}
              <div className="border-t border-[var(--border)] pt-0.5">
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-[10px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                  onClick={() => {
                    setTypeFilter(new Set(ALL_ACTIVITY_TYPE_IDS))
                    setFilterMenuOpen(false)
                  }}
                >
                  Show all types
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      <div className="px-spacing-6 py-spacing-3 flex shrink-0 items-center justify-between gap-2">
        <h3 className="body-3 min-w-0 shrink font-semibold text-[var(--color-foreground)]">
          Activity
        </h3>
        {activityToolbarRight}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-spacing-6 py-spacing-3 flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <p className="body-3 text-muted-foreground py-8 text-center">No activity yet</p>
          ) : filteredEvents.length === 0 ? (
            <p className="body-3 text-muted-foreground py-8 text-center">No matching activity</p>
          ) : (
            <div className="relative space-y-0">
              {filteredEvents.map((ev, idx) => {
                const avatarUrl = eventActorAvatarUrl(ev)
                const isActorEvent =
                  ev.event_type === 'note_added' || ev.event_type === 'field_change'
                const meta = isActorEvent
                  ? resolveActorMeta(ev, currentUserId, authDisplayName)
                  : { label: '', senderLabel: '' }
                const isFirst = idx === 0
                const isLast = idx === filteredEvents.length - 1

                return (
                  <div key={ev.id} className="relative flex gap-3 py-2">
                    <div className="relative flex w-6 shrink-0 flex-col items-center self-stretch">
                      {!isFirst ? (
                        <div
                          aria-hidden
                          className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-[var(--border)]"
                          style={{ height: '1.375rem' }}
                        />
                      ) : null}
                      {!isLast ? (
                        <div
                          aria-hidden
                          className="absolute bottom-0 left-1/2 top-[1.375rem] w-px -translate-x-1/2 bg-[var(--border)]"
                        />
                      ) : null}
                      <div
                        className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-background)] ring-2 ring-[var(--border)] ${eventDotClass(ev.event_type)}`}
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : isActorEvent ? (
                          <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-[var(--color-muted-foreground)]">
                            {meta.senderLabel.charAt(0) || '?'}
                          </span>
                        ) : (
                          <EventIcon type={ev.event_type} />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      {ev.event_type === 'note_added' ? (
                        <NoteCard
                          ev={ev}
                          meta={meta}
                          contactId={contactId}
                          currentUserId={currentUserId}
                          onUpdated={(_noteId, patch) => {
                            setEvents((prev) =>
                              prev.map((e) =>
                                e.id === ev.id ? { ...e, payload: { ...e.payload, ...patch } } : e,
                              ),
                            )
                          }}
                        />
                      ) : ev.event_type === 'field_change' ? (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="gap-spacing-1 flex min-w-0 flex-wrap items-center">
                              <span className="body-3 font-medium text-[var(--foreground)]">
                                {meta.label}
                              </span>
                              <span className="body-3 text-[var(--color-muted-foreground)]">
                                {fieldChangePhrase(ev.payload)}
                              </span>
                            </div>
                            <span className="body-4 shrink-0 text-[var(--color-muted-foreground)]">
                              {formatRelativeTime(ev.created_at)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="body-3 leading-snug text-[var(--foreground)]">
                            {eventLabelPlain(ev)}
                          </p>
                          <p className="body-4 mt-0.5 text-[var(--color-muted-foreground)]">
                            {formatRelativeTime(ev.created_at)}
                          </p>
                          {ev.event_type === 'funnel_submission' &&
                            typeof ev.payload.source_domain === 'string' &&
                            ev.payload.source_domain && (
                              <p className="body-4 mt-0.5 text-[var(--color-muted-foreground)]">
                                from {ev.payload.source_domain}
                              </p>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="px-spacing-6 pb-spacing-4 pt-spacing-2 flex-shrink-0">
          <div className="input-glass relative flex flex-col overflow-hidden rounded-2xl">
            {recordingState !== 'idle' ? (
              <div className="flex items-center px-4 py-2">
                <div className="flex-1">
                  <SimpleChatAudioRecorder
                    isRecording={recordingState === 'recording'}
                    insertionMode
                    onTranscriptionUpdate={(_full, sessionText) => {
                      if (sessionText)
                        setNoteText(notePrefixBeforeRecordingRef.current + sessionText)
                    }}
                    onTranscriptionComplete={(_full, sessionText) => {
                      if (sessionText)
                        setNoteText(notePrefixBeforeRecordingRef.current + sessionText)
                      setRecordingState('idle')
                    }}
                    onError={() => setRecordingState('idle')}
                  />
                </div>
                <div className="flex items-center gap-1">
                  {recordingState === 'recording' && (
                    <>
                      <Tooltip label="Stop">
                        <button
                          type="button"
                          onClick={() => setRecordingState('finishing')}
                          className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full"
                        >
                          <Square className="h-3 w-3 text-red-500" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Cancel">
                        <button
                          type="button"
                          onClick={() => {
                            setNoteText(notePrefixBeforeRecordingRef.current)
                            setRecordingState('idle')
                          }}
                          className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>
                    </>
                  )}
                  {recordingState === 'finishing' && (
                    <span className="body-4 text-muted-foreground px-1">Finishing…</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-4 py-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSendNote()
                    }
                  }}
                  placeholder="Add a note..."
                  rows={2}
                  className="body-3 placeholder:text-muted-foreground min-h-10 w-full resize-none bg-transparent text-[var(--foreground)] outline-none"
                />
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1">
              <Tooltip label="Voice input">
                <button
                  type="button"
                  disabled={sending || recordingState !== 'idle'}
                  onClick={() => {
                    notePrefixBeforeRecordingRef.current = noteText
                    setRecordingState('recording')
                  }}
                  className="button-glass-neutral flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-30"
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              <div className="min-w-0 flex-1" aria-hidden />
              <NoteColorPicker
                value={noteCardTint}
                onChange={setNoteCardTint}
                variant="icon"
                placement="up"
                disabled={sending || recordingState !== 'idle'}
              />
              <button
                type="button"
                onClick={() => void handleSendNote()}
                disabled={!noteText.trim() || sending || recordingState !== 'idle'}
                className="button-glass-neutral flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-30"
                aria-label="Send note"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
