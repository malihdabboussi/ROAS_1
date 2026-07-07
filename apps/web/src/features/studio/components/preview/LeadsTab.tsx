'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
} from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { ContactInfoPanel } from '@/features/contacts/components/ContactInfoPanel'
import { fetchContact, type Contact } from '@/lib/contacts/contacts-api'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import {
  fetchCampaignContacts,
  type CrmContactRow,
  type CrmSort,
} from '../../services/leads.service'
import { AllContactsModal } from './AllContactsModal'

interface LeadsTabProps {
  campaignId: string
}

type ColumnId =
  | 'name'
  | 'email'
  | 'phone'
  | 'created_at'
  | 'tags'
  | 'funnel'
  | 'source_domain'
  | 'contact_source'
  | 'contact_type'

type ColumnVisibility = Record<ColumnId, boolean>

const DEFAULT_COLUMNS: ColumnVisibility = {
  name: true,
  email: true,
  phone: true,
  created_at: true,
  tags: true,
  funnel: true,
  source_domain: false,
  contact_source: false,
  contact_type: false,
}

const COLUMN_OPTIONS: Array<{ id: ColumnId; label: string }> = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'created_at', label: 'Created' },
  { id: 'tags', label: 'Tags' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'source_domain', label: 'Source Domain' },
  { id: 'contact_source', label: 'Contact Source' },
  { id: 'contact_type', label: 'Type' },
]

const SORT_OPTIONS: Array<{ id: CrmSort; label: string }> = [
  { id: 'created_at.desc', label: 'Newest first' },
  { id: 'created_at.asc', label: 'Oldest first' },
  { id: 'email.asc', label: 'Email A → Z' },
  { id: 'email.desc', label: 'Email Z → A' },
  { id: 'name.asc', label: 'Name A → Z' },
  { id: 'name.desc', label: 'Name Z → A' },
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDisplayName(r: CrmContactRow): string {
  const first = r.first_name?.trim()
  const last = r.last_name?.trim()
  return [first, last].filter(Boolean).join(' ') || '—'
}

function safeLoadJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function safeSaveJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function buildGridTemplate(vis: ColumnVisibility): string {
  const cols: string[] = []
  if (vis.name) cols.push('minmax(140px, 1fr)')
  if (vis.email) cols.push('minmax(180px, 1.2fr)')
  if (vis.phone) cols.push('minmax(120px, 0.8fr)')
  if (vis.created_at) cols.push('minmax(100px, 0.6fr)')
  if (vis.tags) cols.push('minmax(180px, 1fr)')
  if (vis.funnel) cols.push('minmax(160px, 1fr)')
  if (vis.source_domain) cols.push('minmax(160px, 1fr)')
  if (vis.contact_source) cols.push('minmax(140px, 0.8fr)')
  if (vis.contact_type) cols.push('minmax(100px, 0.6fr)')
  return cols.join(' ')
}

export function LeadsTab({ campaignId }: LeadsTabProps) {
  const leadsColumnsStorageKey = getOrgScopedKey('leads-tab-columns')
  const tagColorByName: Record<string, string> = {}

  const [rows, setRows] = useState<CrmContactRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<CrmSort>('created_at.desc')
  const [sortOpen, setSortOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    const saved = safeLoadJson<Partial<ColumnVisibility>>(leadsColumnsStorageKey)
    return { ...DEFAULT_COLUMNS, ...(saved ?? {}) }
  })

  useEffect(
    () => safeSaveJson(leadsColumnsStorageKey, columnVisibility),
    [columnVisibility, leadsColumnsStorageKey],
  )

  const [offset, setOffset] = useState(0)
  const limit = 50

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contactLoading, setContactLoading] = useState(false)
  const [allContactsOpen, setAllContactsOpen] = useState(false)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleAllContactsMobile = useCallback(() => {
    setAllContactsOpen(true)
    window.dispatchEvent(
      new CustomEvent('mobile-artifact-preview', {
        detail: { name: 'Import to campaign', hasSettings: false },
      }),
    )
  }, [])

  useEffect(() => {
    if (!isMobile) return
    const handler = () => setAllContactsOpen(false)
    window.addEventListener('mobile-artifact-back', handler)
    return () => window.removeEventListener('mobile-artifact-back', handler)
  }, [isMobile])

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setOffset(0)
  }, [debouncedSearch, sort])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setSortOpen(false)
        setColumnsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const load = useCallback(
    async (mode: 'replace' | 'append' = 'replace') => {
      setLoading(true)
      const useOffset = mode === 'append' ? offset : 0
      try {
        const res = await fetchCampaignContacts({
          campaignId,
          limit,
          offset: useOffset,
          sort,
          search: debouncedSearch || undefined,
        })
        setTotal(res.total ?? 0)
        setRows((prev) =>
          mode === 'append' ? [...prev, ...(res.contacts ?? [])] : (res.contacts ?? []),
        )
        setOffset(useOffset + limit)
      } finally {
        setLoading(false)
      }
    },
    [campaignId, offset, sort, debouncedSearch],
  )

  useEffect(() => {
    load('replace')
  }, [debouncedSearch, sort, campaignId])

  const hasMore = rows.length < total

  const handleRowClick = async (contactId: string) => {
    setContactLoading(true)
    try {
      const contact = await fetchContact(contactId)
      setSelectedContact(contact)
    } finally {
      setContactLoading(false)
    }
  }

  const handleContactUpdated = (updated: Contact) => {
    setSelectedContact(updated)
    setRows((prev) =>
      prev.map((r) =>
        r.id === updated.id
          ? {
              ...r,
              first_name: updated.first_name,
              last_name: updated.last_name,
              phone: updated.phone,
              tags: updated.tags ?? [],
            }
          : r,
      ),
    )
  }

  if (loading && rows.length === 0) {
    return (
      <div className="card-glass flex h-full items-center justify-center overflow-hidden rounded-2xl">
        <VibeyLoadingOrb size="sm" text="Loading leads..." />
      </div>
    )
  }

  if (selectedContact) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl">
        <ContactInfoPanel
          contact={selectedContact}
          onContactUpdated={handleContactUpdated}
          onClose={() => setSelectedContact(null)}
        />
      </div>
    )
  }

  const gridTemplateColumns = buildGridTemplate(columnVisibility)

  return (
    <>
      <div className="card-glass flex h-full flex-col overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="border-border flex flex-shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="icon-sm text-muted-foreground" />
            <span className="body-2 text-foreground font-medium">Leads</span>
            <span className="typo-caption text-muted-foreground">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (isMobile ? handleAllContactsMobile() : setAllContactsOpen(true))}
              className="chip-glass-green flex h-8 items-center gap-1 rounded-lg px-3"
            >
              <UserPlus className="icon-xs shrink-0" />
              <span className="typo-caption font-medium">Import to campaign</span>
            </button>
            <button
              type="button"
              onClick={() => load('replace')}
              disabled={loading}
              className="chip-glass-neutral flex h-8 items-center gap-1 rounded-lg px-3"
            >
              <RefreshCw
                className={`icon-xs text-muted-foreground ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-border flex flex-shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
          {/* Search */}
          <div className="relative w-48">
            <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="input-glass input-leading h-8 w-full pr-3 text-xs"
            />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2" ref={dropdownRef}>
            {/* Sort */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSortOpen((v) => !v)
                  setColumnsOpen(false)
                }}
                className="chip-glass-neutral flex h-8 items-center gap-1 rounded-lg px-2"
              >
                <SlidersHorizontal className="text-muted-foreground h-3.5 w-3.5" />
                <ChevronDown className="text-muted-foreground h-3 w-3" />
              </button>
              {sortOpen && (
                <div className="z-dropdown absolute right-0 top-full mt-1">
                  <div className="dropdown-menu-solid min-w-[180px] p-1.5">
                    <div className="typo-caption text-muted-foreground px-2 py-1 uppercase">
                      Sort
                    </div>
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSort(opt.id)
                          setSortOpen(false)
                        }}
                        className={`body-4 w-full rounded px-2 py-1.5 text-left transition-all ${
                          sort === opt.id
                            ? 'dropdown-option-selected text-foreground'
                            : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Columns */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setColumnsOpen((v) => !v)
                  setSortOpen(false)
                }}
                className="chip-glass-neutral flex h-8 items-center gap-1 rounded-lg px-2"
              >
                <span className="body-4 text-muted-foreground">Columns</span>
                <ChevronDown className="text-muted-foreground h-3 w-3" />
              </button>
              {columnsOpen && (
                <div className="z-dropdown mt-spacing-1 absolute right-0 top-full" data-dropdown>
                  <div className="dropdown-menu-solid p-spacing-2 min-w-48">
                    <div className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 uppercase tracking-wider">
                      Show columns
                    </div>
                    <div className="space-y-spacing-1">
                      {COLUMN_OPTIONS.map((col) => {
                        const isVisible = columnVisibility[col.id]
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() =>
                              setColumnVisibility((prev) => ({ ...prev, [col.id]: !prev[col.id] }))
                            }
                            className="gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 hover:bg-hover-subtle body-3 flex w-full items-center text-left"
                          >
                            {isVisible ? (
                              <Check className="icon-sm text-primary shrink-0" aria-hidden />
                            ) : (
                              <div className="icon-sm shrink-0" aria-hidden />
                            )}
                            <span className="text-muted-foreground">{col.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {rows.length > 0 ? (
            <div className="flex-1 overflow-auto">
              {/* Grid Header */}
              <div
                className="bg-card border-border sticky top-0 z-10 grid items-center gap-4 border-b px-3 py-2"
                style={{ gridTemplateColumns, minWidth: 'fit-content' }}
              >
                {columnVisibility.name && (
                  <div className="typo-caption text-muted-foreground uppercase tracking-wider">
                    Name
                  </div>
                )}
                {columnVisibility.email && (
                  <div className="typo-caption text-muted-foreground uppercase tracking-wider">
                    Email
                  </div>
                )}
                {columnVisibility.phone && (
                  <div className="typo-caption text-muted-foreground uppercase tracking-wider">
                    Phone
                  </div>
                )}
                {columnVisibility.created_at && (
                  <div className="typo-caption text-muted-foreground uppercase tracking-wider">
                    Created
                  </div>
                )}
                {columnVisibility.tags && (
                  <div className="typo-caption text-muted-foreground uppercase tracking-wider">
                    Tags
                  </div>
                )}
                {columnVisibility.funnel && (
                  <div className="typo-caption text-muted-foreground uppercase tracking-wider">
                    Funnel
                  </div>
                )}
                {columnVisibility.source_domain && (
                  <div className="typo-caption text-muted-foreground uppercase tracking-wider">
                    Source Domain
                  </div>
                )}
                {columnVisibility.contact_source && (
                  <div className="typo-caption text-muted-foreground uppercase tracking-wider">
                    Contact Source
                  </div>
                )}
                {columnVisibility.contact_type && (
                  <div className="typo-caption text-muted-foreground uppercase tracking-wider">
                    Type
                  </div>
                )}
              </div>

              {/* Grid Rows */}
              <div style={{ minWidth: 'fit-content' }}>
                {rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => handleRowClick(row.id)}
                    className="w-full text-left"
                  >
                    <div
                      className="border-border hover:bg-hover-subtle grid items-center gap-4 border-b px-3 py-2 transition-colors"
                      style={{ gridTemplateColumns }}
                    >
                      {columnVisibility.name && (
                        <div className="body-3 text-foreground truncate font-medium">
                          {getDisplayName(row)}
                        </div>
                      )}
                      {columnVisibility.email && (
                        <div className="body-3 text-foreground truncate">{row.email}</div>
                      )}
                      {columnVisibility.phone && (
                        <div className="body-3 text-muted-foreground truncate">
                          {row.phone || '—'}
                        </div>
                      )}
                      {columnVisibility.created_at && (
                        <div className="body-3 text-muted-foreground">
                          {formatDate(row.created_at)}
                        </div>
                      )}
                      {columnVisibility.tags && (
                        <div className="min-w-0">
                          {Array.isArray(row.tags) && row.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.tags.slice(0, 2).map((t) => {
                                const color = tagColorByName[t]
                                return (
                                  <span
                                    key={t}
                                    className="body-4 surface-card border-border inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                                  >
                                    {color && (
                                      <span
                                        className={`inline-block h-1.5 w-1.5 rounded-full tintbg-${color}`}
                                      />
                                    )}
                                    <span className="max-w-[60px] truncate">{t}</span>
                                  </span>
                                )
                              })}
                              {row.tags.length > 2 && (
                                <span className="body-4 text-muted-foreground">
                                  +{row.tags.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="body-3 text-muted-foreground">—</span>
                          )}
                        </div>
                      )}
                      {columnVisibility.funnel && (
                        <div className="body-3 text-foreground truncate">
                          {row.funnel_title || '—'}
                        </div>
                      )}
                      {columnVisibility.source_domain && (
                        <div className="body-3 text-muted-foreground truncate">
                          {row.source_domain || '—'}
                        </div>
                      )}
                      {columnVisibility.contact_source && (
                        <div className="body-3 text-muted-foreground truncate">
                          {row.contact_source || '—'}
                        </div>
                      )}
                      {columnVisibility.contact_type && (
                        <div className="body-3 text-muted-foreground truncate capitalize">
                          {row.contact_type || '—'}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center py-3">
                  <button
                    type="button"
                    onClick={() => load('append')}
                    disabled={loading}
                    className="button-glass-neutral body-4 rounded-lg px-4 py-1.5 font-medium disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : `Load more (${rows.length} of ${total})`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <Users className="text-muted-foreground mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="body-2 text-muted-foreground">No leads yet</p>
                <p className="body-3 text-muted-foreground mt-1">
                  Create a funnel to start capturing leads, or import contacts
                </p>
                <button
                  type="button"
                  onClick={() => (isMobile ? handleAllContactsMobile() : setAllContactsOpen(true))}
                  className="chip-glass-green mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span>Import to campaign</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {contactLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20">
            <VibeyLoadingOrb size="sm" text="Loading contact..." />
          </div>
        )}
      </div>

      {allContactsOpen && (
        <AllContactsModal
          campaignId={campaignId}
          onClose={() => {
            setAllContactsOpen(false)
            if (isMobile) window.dispatchEvent(new Event('mobile-artifact-back'))
          }}
          onImported={() => load('replace')}
        />
      )}
    </>
  )
}
