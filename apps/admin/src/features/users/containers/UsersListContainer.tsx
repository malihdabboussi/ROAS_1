'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { OrgMetricsCards } from '../components/OrgMetricsCards'
import { OrgsTable } from '../components/OrgsTable'
import type { OrgSort } from '../components/OrgsTable'
import { UserMetricsCards } from '../components/UserMetricsCards'
import { UsersHubToolbar } from '../components/UsersHubToolbar'
import type { DateRangePreset, UserSort } from '../components/UsersHubToolbar'
import { UsersTable } from '../components/UsersTable'
import type { ColumnId, ColumnVisibility } from '../components/UsersTable'
import { fetchOrgs } from '../services/orgs.service'
import { fetchUsers } from '../services/users.service'
import type { OrgRow } from '../types/orgs.types'
import type { UserMetrics, UserRow } from '../types/users.types'

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  email: true,
  display_name: true,
  role: true,
  fly_machine_id: true,
  total_tokens: true,
  total_credits: true,
  credits_remaining: true,
  total_cost: true,
  subscription_plan: true,
  subscription_status: true,
  subscription_end: true,
  created_at: true,
}

function dateRangeToFrom(preset: DateRangePreset): Date | null {
  if (!preset) return null
  const now = new Date()
  const map: Record<string, number> = {
    '7d': 7,
    '14d': 14,
    '1m': 30,
    '2m': 60,
    '3m': 90,
    '6m': 180,
    '12m': 365,
  }
  const days = map[preset]
  if (!days) return null
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export function UsersListContainer() {
  const [hubTab, setHubTab] = useState<'users' | 'orgs'>('users')
  const [allUsers, setAllUsers] = useState<UserRow[]>([])
  const [allOrgs, setAllOrgs] = useState<OrgRow[]>([])
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgsError, setOrgsError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangePreset>(null)
  const [currentSort, setCurrentSort] = useState<UserSort>('created_at.desc')
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibility>(DEFAULT_COLUMN_VISIBILITY)

  const [orgSearch, setOrgSearch] = useState('')
  const [orgSort, setOrgSort] = useState<OrgSort>('created_at.desc')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOrgsError(null)
    await Promise.all([
      (async () => {
        try {
          const data = await fetchUsers()
          setMetrics(data.metrics)
          setAllUsers(data.users)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load users')
        }
      })(),
      (async () => {
        try {
          const data = await fetchOrgs()
          setAllOrgs(data.orgs)
        } catch (e) {
          setOrgsError(e instanceof Error ? e.message : 'Failed to load orgs')
        }
      })(),
    ])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setActiveDropdown(null)
  }, [hubTab])

  const filteredUsers = useMemo(() => {
    let filtered = [...allUsers]

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          (u.email ?? '').toLowerCase().includes(q) ||
          (u.display_name ?? '').toLowerCase().includes(q),
      )
    }

    if (roleFilter) {
      filtered = filtered.filter((u) => u.role === roleFilter)
    }

    const fromDate = dateRangeToFrom(dateRange)
    if (fromDate) {
      filtered = filtered.filter((u) => new Date(u.created_at ?? 0) >= fromDate)
    }

    const [sortKey, sortDir] = currentSort.split('.') as [string, 'asc' | 'desc']
    filtered.sort((a, b) => {
      let aVal: unknown = (a as Record<string, unknown>)[sortKey]
      let bVal: unknown = (b as Record<string, unknown>)[sortKey]
      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''
      if (typeof aVal === 'string') {
        const c = String(aVal).localeCompare(String(bVal))
        return sortDir === 'asc' ? c : -c
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    })

    return filtered
  }, [allUsers, search, roleFilter, dateRange, currentSort])

  const filteredOrgs = useMemo(() => {
    let filtered = [...allOrgs]
    if (orgSearch) {
      const q = orgSearch.toLowerCase()
      filtered = filtered.filter(
        (o) =>
          (o.name ?? '').toLowerCase().includes(q) ||
          (o.slug ?? '').toLowerCase().includes(q) ||
          (o.owner_email ?? '').toLowerCase().includes(q),
      )
    }
    const [sortKey, sortDir] = orgSort.split('.') as [string, 'asc' | 'desc']
    filtered.sort((a, b) => {
      let aVal: unknown = (a as Record<string, unknown>)[sortKey]
      let bVal: unknown = (b as Record<string, unknown>)[sortKey]
      if (aVal == null) aVal = ''
      if (bVal == null) bVal = ''
      if (typeof aVal === 'string') {
        const c = String(aVal).localeCompare(String(bVal))
        return sortDir === 'asc' ? c : -c
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    })
    return filtered
  }, [allOrgs, orgSearch, orgSort])

  const hasActiveUserFilters = Boolean(search || roleFilter || dateRange)
  const hasActiveOrgFilters = Boolean(orgSearch)

  const handleClearFilters = () => {
    setSearch('')
    setRoleFilter(null)
    setDateRange(null)
  }

  const handleClearOrgFilters = () => {
    setOrgSearch('')
  }

  const handleColumnVisibilityChange = (columnId: ColumnId, visible: boolean) => {
    setColumnVisibility((prev) => ({ ...prev, [columnId]: visible }))
  }

  return (
    <Tabs
      value={hubTab}
      onValueChange={(v) => setHubTab(v as 'users' | 'orgs')}
      className="gap-spacing-6 flex flex-col"
    >
      {hubTab === 'users' ? (
        <UserMetricsCards metrics={metrics} loading={loading} error={error} />
      ) : (
        <OrgMetricsCards orgs={allOrgs} loading={loading} error={orgsError} />
      )}

      <UsersHubToolbar
        hubMode={hubTab}
        searchValue={hubTab === 'users' ? search : orgSearch}
        onSearchChange={hubTab === 'users' ? setSearch : setOrgSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClearFilters={hubTab === 'users' ? handleClearFilters : handleClearOrgFilters}
        hasActiveFilters={hubTab === 'users' ? hasActiveUserFilters : hasActiveOrgFilters}
        activeDropdown={activeDropdown}
        onSetActiveDropdown={setActiveDropdown}
        currentSort={currentSort}
        onSortChange={setCurrentSort}
        orgSort={orgSort}
        onOrgSortChange={setOrgSort}
        onRefresh={loadData}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
      />

      <TabsContent value="users" className="mt-0">
        <div className="surface-card border-border rounded-spacing-2 p-spacing-4 border">
          <h3 className="title-h4 text-foreground mb-spacing-4">All Users</h3>
          <UsersTable
            loading={loading}
            error={error}
            rows={filteredUsers}
            currentSort={currentSort}
            onSortChange={setCurrentSort}
            columnVisibility={columnVisibility}
          />
        </div>
      </TabsContent>

      <TabsContent value="orgs" className="mt-0">
        <div className="surface-card border-border rounded-spacing-2 p-spacing-4 border">
          <h3 className="title-h4 text-foreground mb-spacing-4">All Orgs</h3>
          <OrgsTable
            loading={loading}
            error={orgsError}
            rows={filteredOrgs}
            currentSort={orgSort}
            onSortChange={setOrgSort}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
