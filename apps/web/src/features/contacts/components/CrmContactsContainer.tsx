'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import {
  listCrmContacts,
  listCrmFunnels,
  type CrmContactRow,
  type CrmSort,
  type CrmStatusFilter,
  type FilterState,
} from '../services/crm-contacts-api'
import {
  countActiveFilters,
  crmListCache,
  DEFAULT_COLUMNS,
  safeLoadJson,
  safeSaveJson,
  type ColumnVisibility,
} from './crm-contacts-container/crm-contacts-container-utils'
import { CrmContactsToolbar } from './crm-contacts-container/CrmContactsToolbar'
import { CrmContactsFilterDrawer } from './CrmContactsFilterDrawer'
import { CrmContactsTable } from './CrmContactsTable'

export function CrmContactsContainer() {
  const filtersStorageKey = getOrgScopedKey('crm-contacts-filters')
  const columnsStorageKey = getOrgScopedKey('crm-contacts-columns')
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<CrmSort>('created_at.desc')
  const [statusFilter, setStatusFilter] = useState<CrmStatusFilter>('all')
  const [filters, setFilters] = useState<FilterState>(
    () => safeLoadJson<FilterState>(filtersStorageKey) ?? {},
  )

  // Debounced search to reduce queries.
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  const listCacheKey = `${getOrgScopedKey('crm-list')}|${sort}|${statusFilter}|${debouncedSearch}|${JSON.stringify(filters)}`
  const initialListSnapshot = crmListCache.get(listCacheKey)
  const [rows, setRows] = useState<CrmContactRow[]>(() => initialListSnapshot?.rows ?? [])
  const [total, setTotal] = useState(() => initialListSnapshot?.total ?? 0)
  const [offset, setOffset] = useState(() => initialListSnapshot?.offset ?? 0)
  const [loading, setLoading] = useState(true)
  /** Cache key the current `rows` state belongs to — guards the sync effect. */
  const rowsCacheKeyRef = useRef<string | null>(initialListSnapshot ? listCacheKey : null)

  const [funnels, setFunnels] = useState<Array<{ id: string; title: string | null }>>([])
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const limit = 50

  const [columnsOpen, setColumnsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    const saved = safeLoadJson<Partial<ColumnVisibility>>(columnsStorageKey)
    return { ...DEFAULT_COLUMNS, ...(saved ?? {}) }
  })

  // Persist local preferences.
  useEffect(
    () => safeSaveJson(columnsStorageKey, columnVisibility),
    [columnVisibility, columnsStorageKey],
  )
  useEffect(() => safeSaveJson(filtersStorageKey, filters), [filters, filtersStorageKey])

  // Close dropdowns when clicking outside.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setColumnsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Load funnels for funnel filter UI.
  useEffect(() => {
    let cancelled = false
    listCrmFunnels().then((res) => {
      if (cancelled) return
      setFunnels(res.funnels ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  // Reset pagination when inputs change.
  useEffect(() => {
    setOffset(0)
  }, [debouncedSearch, sort, statusFilter, filters])

  // Restore the last known list for this query signature (instant repaint
  // when navigating back from a contact detail) while the load effect
  // revalidates in background.
  useEffect(() => {
    if (rowsCacheKeyRef.current === listCacheKey) return
    const cached = crmListCache.get(listCacheKey)
    if (!cached) return
    setRows(cached.rows)
    setTotal(cached.total)
    setOffset(cached.offset)
    rowsCacheKeyRef.current = listCacheKey
  }, [listCacheKey])

  // Keep the snapshot in sync with state (covers fetches and local row edits).
  useEffect(() => {
    if (rowsCacheKeyRef.current !== listCacheKey) return
    crmListCache.set(listCacheKey, { rows, total, offset })
  }, [listCacheKey, rows, total, offset])

  const includeArchived = statusFilter === 'archived'
  const contactType =
    statusFilter === 'lead' || statusFilter === 'customer' ? statusFilter : undefined

  const load = useCallback(
    async (mode: 'replace' | 'append' = 'replace') => {
      setLoading(true)
      const useOffset = mode === 'append' ? offset : 0
      try {
        const res = await listCrmContacts({
          limit,
          offset: useOffset,
          sort,
          search: debouncedSearch || undefined,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          includeArchived,
          contactType,
        })

        rowsCacheKeyRef.current = listCacheKey
        setTotal(res.total ?? 0)
        setRows((prev) =>
          mode === 'append' ? [...prev, ...(res.contacts ?? [])] : (res.contacts ?? []),
        )
        setOffset(useOffset + limit)
      } finally {
        setLoading(false)
      }
    },
    [offset, sort, debouncedSearch, filters, includeArchived, contactType, listCacheKey],
  )

  useEffect(() => {
    load('replace')
  }, [debouncedSearch, sort, statusFilter, filters])

  const hasMore = rows.length < total

  const activeFilterCount = useMemo(() => {
    return countActiveFilters(filters)
  }, [filters])

  return (
    <main className="space-y-spacing-6 p-spacing-3 sm:p-spacing-6">
      <CrmContactsToolbar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sort={sort}
        setSort={setSort}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        activeFilterCount={activeFilterCount}
        columnsOpen={columnsOpen}
        setColumnsOpen={setColumnsOpen}
        dropdownRef={dropdownRef}
        loading={loading}
        onOpenFilters={() => setFilterDrawerOpen(true)}
        onRefresh={() => load('replace')}
      />

      <CrmContactsFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onApply={(next) => {
          setFilters(next)
          setFilterDrawerOpen(false)
        }}
        funnels={funnels}
      />

      {/* Body */}
      {loading && rows.length === 0 ? (
        <div className="h-full min-h-[400px] w-full">
          <PageSkeleton label="Loading your contacts..." />
        </div>
      ) : (
        <div className="surface-card border-border rounded-spacing-2 p-spacing-4 border">
          <CrmContactsTable
            rows={rows}
            loading={loading}
            total={total}
            hasMore={hasMore}
            columnVisibility={columnVisibility}
            tagColorByName={{}}
            onLoadMore={() => load('append')}
            onRowClick={(id) => router.push(`/contacts/${id}`)}
          />
        </div>
      )}
    </main>
  )
}
