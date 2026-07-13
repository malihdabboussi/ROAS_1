'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { motion } from 'framer-motion'
import { GripVertical, User } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchContact,
  updateContact,
  type Contact,
} from '@/lib/contacts/contacts-api'
import {
  fetchContacts,
  type CrmContactRow,
  type CrmSort,
} from '../../services/contacts-view.service'
import type { SelectOption, ViewDef } from '../../types/space-schema'
import { ContactActivityTimeline } from './ContactActivityTimeline'
import {
  ContactCommunicationPanel,
  type ContactCommunicationTab,
} from './ContactCommunicationPanel'
import { ContactInfoSection } from './ContactInfoSection'
import { ContactsSpaceList } from './ContactsSpaceList'

const CONTACT_QS = 'contact'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Module-level SWR snapshots (pattern 3, model `itemsCacheBySpaceQuery`):
 * the contacts view is a conditional branch in SpaceContentRouter, so every
 * view/space switch fully remounts it. Restoring the last list/detail state
 * paints instantly while the background refetch revalidates.
 */
interface ContactsListSnapshot {
  rows: CrmContactRow[]
  total: number
  offset: number
}
const contactsListCache = new Map<string, ContactsListSnapshot>()
const contactDetailCache = new Map<string, Contact>()

function contactsListCacheKey(opts: {
  campaignId: string | null
  scope: 'campaign' | 'all'
  sort: CrmSort
  statusFilter: string
  activeSegmentId: string | null
  search: string
}) {
  return `${opts.scope}|${opts.campaignId ?? ''}|${opts.sort}|${opts.statusFilter}|${opts.activeSegmentId ?? ''}|${opts.search}`
}

/** Default column widths; max = 1.5× these (user-requested range). */
const CONTACT_INFO_MIN_W = 280
const CONTACT_INFO_MAX_W = 420
const CONTACT_INFO_COLLAPSED_W = 80
const CONTACT_INFO_EXPANDED_KEY = 'contact-info-panel-expanded'

function readContactInfoExpanded(): boolean {
  try {
    return window.localStorage.getItem(CONTACT_INFO_EXPANDED_KEY) !== '0'
  } catch {
    return true
  }
}

function persistContactInfoExpanded(expanded: boolean) {
  try {
    window.localStorage.setItem(CONTACT_INFO_EXPANDED_KEY, expanded ? '1' : '0')
  } catch {}
}
const ACTIVITY_MIN_W = 360
const ACTIVITY_MAX_W = 540

function clampWidth(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function ContactsColumnResizeHandle({
  isDragging,
  onPointerDown,
  onDoubleClick,
}: {
  isDragging: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  onDoubleClick: (e: MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className="group relative flex w-4 flex-shrink-0 cursor-col-resize items-center justify-center"
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
    >
      <div
        className={`resize-divider-line-blue-full pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-opacity ${
          isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
        }`}
      />
      <GripVertical
        className={`h-4 w-4 transition-opacity ${
          isDragging ? 'opacity-0' : 'text-muted-foreground opacity-0 group-hover:opacity-100'
        }`}
      />
    </div>
  )
}

export interface ContactsViewHandle {
  refresh: () => void
  back: () => void
}

/** Pixel width of `ContactsColumnResizeHandle` (`w-4`); keep in sync with toolbar alignment. */
export const CONTACT_DETAIL_RESIZE_HANDLE_PX = 16

export interface ContactDetailLayoutSizes {
  infoWidthPx: number
  activityWidthPx: number
  commsWidthPx: number
}

interface ContactsViewProps {
  campaignId: string | null
  contactsScope: 'campaign' | 'all'
  view: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void
  onOpenAddColumn: (e: MouseEvent<HTMLButtonElement>) => void
  search: string
  statusFilter: 'all' | 'lead' | 'customer'
  sort: CrmSort
  loading: boolean
  onLoadingChange: (loading: boolean) => void
  onDetailChange?: (open: boolean) => void
  activeSegmentId?: string | null
  communicationTab: ContactCommunicationTab
  onDetailContactIdChange?: () => void
  onContactDetailLayout?: (layout: ContactDetailLayoutSizes | null) => void
  onCommunicationLoaded?: () => void
}

export const ContactsView = forwardRef<ContactsViewHandle, ContactsViewProps>(function ContactsView(
  {
    campaignId,
    contactsScope,
    view,
    onViewPatch,
    onOpenAddColumn,
    search,
    statusFilter,
    sort,
    loading,
    onLoadingChange,
    onDetailChange,
    activeSegmentId = null,
    communicationTab,
    onDetailContactIdChange,
    onContactDetailLayout,
    onCommunicationLoaded,
  },
  ref,
) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const contactParam = searchParams.get(CONTACT_QS)

  const [debouncedSearch, setDebouncedSearch] = useState(search)

  const listCacheKey = contactsListCacheKey({
    campaignId,
    scope: contactsScope,
    sort,
    statusFilter,
    activeSegmentId,
    search: debouncedSearch,
  })
  const initialListSnapshot = contactsListCache.get(listCacheKey)
  const [rows, setRows] = useState<CrmContactRow[]>(() => initialListSnapshot?.rows ?? [])
  const [total, setTotal] = useState(() => initialListSnapshot?.total ?? 0)
  const [offset, setOffset] = useState(() => initialListSnapshot?.offset ?? 0)
  /** Cache key the current `rows` state belongs to — guards the sync effect. */
  const rowsCacheKeyRef = useRef<string | null>(initialListSnapshot ? listCacheKey : null)

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [activityRefreshKey, setActivityRefreshKey] = useState(0)
  const [contactInfoExpanded, setContactInfoExpanded] = useState(true)
  const [contactInfoWidth, setContactInfoWidth] = useState(CONTACT_INFO_MIN_W)
  const [activityWidth, setActivityWidth] = useState(ACTIVITY_MIN_W)
  const [columnResize, setColumnResize] = useState<'left' | 'right' | null>(null)
  const columnResizeLastXRef = useRef(0)
  const prevCampaignIdRef = useRef<string | null>(null)
  const commsColRef = useRef<HTMLDivElement>(null)
  const [commsWidthPx, setCommsWidthPx] = useState(0)

  const limit = 50

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setOffset(0)
  }, [debouncedSearch, sort, statusFilter, activeSegmentId, contactsScope])

  // Restore the last known list for this query signature (instant repaint on
  // view/filter switches) while the load effect revalidates in background.
  useEffect(() => {
    if (rowsCacheKeyRef.current === listCacheKey) return
    const cached = contactsListCache.get(listCacheKey)
    if (!cached) return
    setRows(cached.rows)
    setTotal(cached.total)
    setOffset(cached.offset)
    rowsCacheKeyRef.current = listCacheKey
  }, [listCacheKey])

  // Keep the snapshot in sync with state (covers fetches and local row edits).
  useEffect(() => {
    if (rowsCacheKeyRef.current !== listCacheKey) return
    contactsListCache.set(listCacheKey, { rows, total, offset })
  }, [listCacheKey, rows, total, offset])

  useEffect(() => {
    onDetailContactIdChange?.()
  }, [selectedContactId, onDetailContactIdChange])

  useEffect(() => {
    setContactInfoExpanded(readContactInfoExpanded())
  }, [])

  const handleContactInfoExpandedChange = useCallback((expanded: boolean) => {
    setContactInfoExpanded(expanded)
    persistContactInfoExpanded(expanded)
  }, [])

  const contactInfoColumnWidth = contactInfoExpanded ? contactInfoWidth : CONTACT_INFO_COLLAPSED_W

  useEffect(() => {
    if (!onContactDetailLayout) return
    if (!selectedContactId) {
      onContactDetailLayout(null)
      return
    }
    onContactDetailLayout({
      infoWidthPx: contactInfoColumnWidth,
      activityWidthPx: activityWidth,
      commsWidthPx,
    })
  }, [
    selectedContactId,
    contactInfoColumnWidth,
    activityWidth,
    commsWidthPx,
    onContactDetailLayout,
  ])

  /** Panels render as soon as we have data for the selected contact (cached or fresh). */
  const detailReady = selectedContact != null && selectedContact.id === selectedContactId

  useLayoutEffect(() => {
    if (!selectedContactId || !detailReady) {
      setCommsWidthPx(0)
      return
    }
    const el = commsColRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setCommsWidthPx(el.offsetWidth)
    })
    ro.observe(el)
    setCommsWidthPx(el.offsetWidth)
    return () => {
      ro.disconnect()
    }
  }, [selectedContactId, detailReady, selectedContact])

  useEffect(() => {
    if (!columnResize) return
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - columnResizeLastXRef.current
      columnResizeLastXRef.current = e.clientX
      if (columnResize === 'left') {
        setContactInfoWidth((w) => clampWidth(w + dx, CONTACT_INFO_MIN_W, CONTACT_INFO_MAX_W))
      } else {
        setActivityWidth((w) => clampWidth(w - dx, ACTIVITY_MIN_W, ACTIVITY_MAX_W))
      }
    }
    const onUp = () => setColumnResize(null)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [columnResize])

  const load = useCallback(
    async (mode: 'replace' | 'append' = 'replace') => {
      onLoadingChange(true)
      const useOffset = mode === 'append' ? offset : 0
      try {
        const res = await fetchContacts({
          campaignId: contactsScope === 'campaign' ? campaignId : null,
          limit,
          offset: useOffset,
          sort,
          search: debouncedSearch || undefined,
          includeArchived: false,
          contactType: statusFilter === 'all' ? undefined : statusFilter,
          segmentId: activeSegmentId || undefined,
        })
        rowsCacheKeyRef.current = listCacheKey
        setTotal(res.total ?? 0)
        setRows((prev) =>
          mode === 'append' ? [...prev, ...(res.contacts ?? [])] : (res.contacts ?? []),
        )
        setOffset(useOffset + limit)
      } finally {
        onLoadingChange(false)
      }
    },
    [
      campaignId,
      contactsScope,
      offset,
      sort,
      debouncedSearch,
      statusFilter,
      activeSegmentId,
      listCacheKey,
      onLoadingChange,
    ],
  )

  const setContactQuery = useCallback(
    (id: string | null) => {
      const p = new URLSearchParams(searchParams.toString())
      if (id && UUID_RE.test(id)) p.set(CONTACT_QS, id)
      else p.delete(CONTACT_QS)
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    const prev = prevCampaignIdRef.current
    prevCampaignIdRef.current = campaignId
    if (prev !== null && prev !== campaignId && searchParams.get(CONTACT_QS)) {
      setContactQuery(null)
    }
  }, [campaignId, searchParams, setContactQuery])

  const handleBack = useCallback(() => {
    setContactQuery(null)
  }, [setContactQuery])

  useEffect(() => {
    load('replace')
  }, [debouncedSearch, sort, statusFilter, campaignId, activeSegmentId, contactsScope])

  useImperativeHandle(ref, () => ({ refresh: () => load('replace'), back: handleBack }), [
    load,
    handleBack,
  ])

  const hasMore = rows.length < total

  const handleSelectContact = useCallback(
    (id: string) => {
      if (!UUID_RE.test(id)) return
      setContactQuery(id)
    },
    [setContactQuery],
  )

  useEffect(() => {
    const raw = contactParam
    if (!raw || !UUID_RE.test(raw)) {
      setSelectedContactId(null)
      setSelectedContact(null)
      onDetailChange?.(false)
      return
    }
    if (selectedContact?.id === raw) {
      setSelectedContactId(raw)
      onDetailChange?.(true)
      return
    }
    let cancelled = false
    setSelectedContactId(raw)
    onDetailChange?.(true)
    // Cache-first: paint the last known contact instantly (panels stay
    // mounted and refetch via the contactId prop), then revalidate.
    const cached = contactDetailCache.get(raw)
    if (cached) setSelectedContact(cached)
    fetchContact(raw).then((c) => {
      contactDetailCache.set(raw, c)
      if (!cancelled) setSelectedContact(c)
    })
    return () => {
      cancelled = true
    }
  }, [contactParam, onDetailChange, selectedContact?.id])

  const patchContactsConfig = useCallback(
    (patch: Record<string, unknown>) => {
      const prev = view.contacts_config ?? {}
      void onViewPatch({ contacts_config: { ...prev, ...patch } })
    },
    [view.contacts_config, onViewPatch],
  )

  const handleCreateTagOption = useCallback(
    (option: SelectOption) => {
      const prev = view.contacts_config?.tag_options ?? []
      if (prev.some((o) => o.id === option.id)) return
      patchContactsConfig({ tag_options: [...prev, option] })
    },
    [view.contacts_config?.tag_options, patchContactsConfig],
  )

  const handleUpdateTagOption = useCallback(
    (optionId: string, updates: Partial<SelectOption>) => {
      const prev = view.contacts_config?.tag_options ?? []
      patchContactsConfig({
        tag_options: prev.map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
      })
    },
    [view.contacts_config?.tag_options, patchContactsConfig],
  )

  const handleDeleteTagOption = useCallback(
    (optionId: string) => {
      const prev = view.contacts_config?.tag_options ?? []
      patchContactsConfig({ tag_options: prev.filter((o) => o.id !== optionId) })
    },
    [view.contacts_config?.tag_options, patchContactsConfig],
  )

  const handleCreateContactTypeOption = useCallback(
    (option: SelectOption) => {
      const prev = view.contacts_config?.contact_type_options ?? []
      if (prev.some((o) => o.id === option.id)) return
      patchContactsConfig({ contact_type_options: [...prev, option] })
    },
    [view.contacts_config?.contact_type_options, patchContactsConfig],
  )

  const handleUpdateContactTypeOption = useCallback(
    (optionId: string, updates: Partial<SelectOption>) => {
      const prev = view.contacts_config?.contact_type_options ?? []
      patchContactsConfig({
        contact_type_options: prev.map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
      })
    },
    [view.contacts_config?.contact_type_options, patchContactsConfig],
  )

  const handleDeleteContactTypeOption = useCallback(
    (optionId: string) => {
      const prev = view.contacts_config?.contact_type_options ?? []
      patchContactsConfig({ contact_type_options: prev.filter((o) => o.id !== optionId) })
    },
    [view.contacts_config?.contact_type_options, patchContactsConfig],
  )

  const handleContactFieldSave = useCallback(
    async (contactId: string, fieldId: string, value: unknown) => {
      const body: Parameters<typeof updateContact>[1] = {}
      if (fieldId === 'email') body.email = typeof value === 'string' ? value : ''
      else if (fieldId === 'phone')
        body.phone = value === '' || value == null ? null : String(value)
      else if (fieldId === 'first_name')
        body.first_name = value === '' || value == null ? null : String(value)
      else if (fieldId === 'last_name')
        body.last_name = value === '' || value == null ? null : String(value)
      else if (fieldId === 'tags') body.tags = Array.isArray(value) ? (value as string[]) : []
      else if (fieldId === 'contact_type')
        (body as Record<string, unknown>).contact_type =
          value === '' || value == null ? null : String(value)
      else if (fieldId === 'contact_source')
        (body as Record<string, unknown>).contact_source =
          value === '' || value == null ? null : String(value)
      else if (
        fieldId === 'business_name' ||
        fieldId === 'website' ||
        fieldId === 'address' ||
        fieldId === 'city' ||
        fieldId === 'state' ||
        fieldId === 'country'
      )
        (body as Record<string, unknown>)[fieldId] =
          value === '' || value == null ? null : String(value)
      else return

      const updated = await updateContact(contactId, body)
      contactDetailCache.set(contactId, updated)
      setRows((prev) =>
        prev.map((r) =>
          r.id === contactId
            ? {
                ...r,
                email: updated.email,
                first_name: updated.first_name,
                last_name: updated.last_name,
                phone: updated.phone,
                tags: updated.tags,
                contact_type: updated.contact_type ?? r.contact_type,
                contact_source: updated.contact_source ?? r.contact_source,
                business_name: updated.business_name ?? r.business_name,
                website: updated.website ?? r.website,
                address: updated.address ?? r.address,
                city: updated.city ?? r.city,
                state: updated.state ?? r.state,
                country: updated.country ?? r.country,
                updated_at: updated.updated_at,
              }
            : r,
        ),
      )
      if (selectedContactId === contactId) {
        setSelectedContact(updated)
      }
      setActivityRefreshKey((k) => k + 1)
    },
    [selectedContactId],
  )

  if (selectedContactId) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {!detailReady || !selectedContact ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb text="Loading contact..." state="processing" size="md" />
          </div>
        ) : (
          <div
            className={`px-spacing-2 pb-spacing-2 pt-spacing-1 flex min-h-0 flex-1 overflow-hidden ${
              columnResize ? 'select-none' : ''
            }`}
          >
            <motion.div
              className="min-h-0 shrink-0 overflow-hidden"
              initial={false}
              animate={{ width: contactInfoColumnWidth }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            >
              <div className="card-glass rounded-spacing-2 flex h-full min-h-0 flex-col overflow-hidden">
                <ContactInfoSection
                  contact={selectedContact}
                  view={view}
                  expanded={contactInfoExpanded}
                  onExpandedChange={handleContactInfoExpandedChange}
                  onContactFieldSave={handleContactFieldSave}
                  onCreateTagOption={handleCreateTagOption}
                  onUpdateTagOption={handleUpdateTagOption}
                  onDeleteTagOption={handleDeleteTagOption}
                  onCreateContactTypeOption={handleCreateContactTypeOption}
                  onUpdateContactTypeOption={handleUpdateContactTypeOption}
                  onDeleteContactTypeOption={handleDeleteContactTypeOption}
                  onNoteAdded={() => setActivityRefreshKey((k) => k + 1)}
                />
              </div>
            </motion.div>
            {contactInfoExpanded ? (
              <ContactsColumnResizeHandle
                isDragging={columnResize === 'left'}
                onPointerDown={(e) => {
                  e.preventDefault()
                  columnResizeLastXRef.current = e.clientX
                  setColumnResize('left')
                }}
                onDoubleClick={() => {
                  setContactInfoWidth((w) =>
                    w >= (CONTACT_INFO_MIN_W + CONTACT_INFO_MAX_W) / 2
                      ? CONTACT_INFO_MIN_W
                      : CONTACT_INFO_MAX_W,
                  )
                }}
              />
            ) : null}
            <div ref={commsColRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <ContactCommunicationPanel
                contactId={selectedContactId}
                contact={selectedContact}
                communicationTab={communicationTab}
                onLoaded={onCommunicationLoaded}
              />
            </div>
            <ContactsColumnResizeHandle
              isDragging={columnResize === 'right'}
              onPointerDown={(e) => {
                e.preventDefault()
                columnResizeLastXRef.current = e.clientX
                setColumnResize('right')
              }}
              onDoubleClick={() => {
                setActivityWidth((w) =>
                  w >= (ACTIVITY_MIN_W + ACTIVITY_MAX_W) / 2 ? ACTIVITY_MIN_W : ACTIVITY_MAX_W,
                )
              }}
            />
            <div className="min-h-0 shrink-0 overflow-hidden" style={{ width: activityWidth }}>
              <div className="card-glass rounded-spacing-2 flex h-full min-h-0 flex-col overflow-hidden">
                <ContactActivityTimeline
                  contactId={selectedContactId}
                  refreshKey={activityRefreshKey}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {loading && rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <VibeyLoadingOrb text="Loading contacts..." state="processing" size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-spacing-8 flex flex-1 items-center justify-center">
          <div className="gap-spacing-6 flex flex-col items-center text-center">
            <div aria-hidden className="relative h-28 w-72 select-none">
              <div className="card-glass left-spacing-4 right-spacing-4 gap-spacing-3 px-spacing-3 py-spacing-2-5 absolute top-0 flex -rotate-6 items-center opacity-50">
                <div className="bg-secondary h-spacing-8 w-spacing-8 shrink-0 rounded-full" />
                <div className="space-y-spacing-1-5 flex-1">
                  <div className="bg-secondary h-spacing-2 w-3/5 rounded-full" />
                  <div className="bg-secondary h-spacing-1-5 w-2/5 rounded-full opacity-70" />
                </div>
              </div>
              <div className="card-glass left-spacing-2 right-spacing-2 top-spacing-5 gap-spacing-3 px-spacing-3 py-spacing-2-5 absolute flex rotate-3 items-center">
                <div className="bg-secondary border-border text-muted-foreground h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-full border">
                  <User className="icon-sm" />
                </div>
                <div className="space-y-spacing-1 min-w-0 flex-1 text-left">
                  <div className="body-3 text-foreground truncate font-medium">Jane Smith</div>
                  <div className="typo-caption text-muted-foreground truncate">jane@roas.io</div>
                </div>
              </div>
            </div>
            <div className="space-y-spacing-1">
              <p className="title-h6 text-foreground">No contacts yet</p>
              <p className="body-3 text-muted-foreground max-w-xs">
                {contactsScope === 'all'
                  ? 'Contacts appear here when people reach you through funnels, forms, your chat widget, Telegram, or imports.'
                  : 'Contacts appear here when leads submit forms on your funnels or are imported into this campaign.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <ContactsSpaceList
            rows={rows}
            view={view}
            onViewPatch={onViewPatch}
            onOpenAddColumn={onOpenAddColumn}
            onRowOpen={handleSelectContact}
            onContactFieldSave={handleContactFieldSave}
            onCreateTagOption={handleCreateTagOption}
            onUpdateTagOption={handleUpdateTagOption}
            onDeleteTagOption={handleDeleteTagOption}
            onCreateContactTypeOption={handleCreateContactTypeOption}
            onUpdateContactTypeOption={handleUpdateContactTypeOption}
            onDeleteContactTypeOption={handleDeleteContactTypeOption}
          />
          {hasMore && (
            <div className="flex shrink-0 justify-center border-t border-[var(--border)] py-3">
              <button
                type="button"
                onClick={() => load('append')}
                disabled={loading}
                className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
              >
                {loading ? 'Loading...' : `Load more (${rows.length} of ${total})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
