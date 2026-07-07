'use client'

import { useEffect } from 'react'
import {
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  Columns,
  RefreshCcw,
  Search,
} from 'lucide-react'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { OrgSort } from './OrgsTable'
import type { ColumnId, ColumnVisibility } from './UsersTable'

export type UserSort =
  | 'created_at.desc'
  | 'created_at.asc'
  | 'email.asc'
  | 'email.desc'
  | 'display_name.asc'
  | 'display_name.desc'
  | 'role.asc'
  | 'role.desc'
  | 'total_tokens.asc'
  | 'total_tokens.desc'
  | 'total_credits.asc'
  | 'total_credits.desc'
  | 'credits_remaining.asc'
  | 'credits_remaining.desc'
  | 'total_cost.asc'
  | 'total_cost.desc'

export type DateRangePreset = '7d' | '14d' | '1m' | '2m' | '3m' | '6m' | '12m' | null

interface UsersHubToolbarProps {
  hubMode: 'users' | 'orgs'
  searchValue: string
  onSearchChange: (value: string) => void
  roleFilter: string | null
  onRoleFilterChange: (v: string | null) => void
  dateRange: DateRangePreset
  onDateRangeChange: (v: DateRangePreset) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  activeDropdown: string | null
  onSetActiveDropdown: (dropdown: string | null) => void
  currentSort: UserSort
  onSortChange: (sort: UserSort) => void
  orgSort?: OrgSort
  onOrgSortChange?: (sort: OrgSort) => void
  onRefresh?: () => void
  columnVisibility: ColumnVisibility
  onColumnVisibilityChange: (columnId: ColumnId, visible: boolean) => void
}

const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'display_name', label: 'Name' },
  { id: 'role', label: 'Role' },
  { id: 'fly_machine_id', label: 'Machine' },
  { id: 'total_tokens', label: 'Tokens' },
  { id: 'total_credits', label: 'Credits' },
  { id: 'credits_remaining', label: 'Credits left' },
  { id: 'total_cost', label: 'Cost' },
  { id: 'subscription_plan', label: 'Plan' },
  { id: 'subscription_status', label: 'Status' },
  { id: 'subscription_end', label: 'End Date' },
  { id: 'created_at', label: 'Created' },
]

const ROLE_OPTIONS: { id: string | null; label: string }[] = [
  { id: null, label: 'All Roles' },
  { id: 'user', label: 'User' },
  { id: 'power', label: 'Power' },
  { id: 'admin', label: 'Admin' },
  { id: 'enterprise', label: 'Enterprise' },
]

const DATE_RANGE_OPTIONS: { id: DateRangePreset; label: string }[] = [
  { id: null, label: 'All Time' },
  { id: '7d', label: '7 days' },
  { id: '14d', label: '14 days' },
  { id: '1m', label: '1 month' },
  { id: '2m', label: '2 months' },
  { id: '3m', label: '3 months' },
  { id: '6m', label: '6 months' },
  { id: '12m', label: '12 months' },
]

const SORT_OPTIONS: {
  group: string
  options: { id: UserSort; label: string; description: string }[]
}[] = [
  {
    group: 'Created',
    options: [
      { id: 'created_at.desc', label: 'Newest first', description: 'Most recently created' },
      { id: 'created_at.asc', label: 'Oldest first', description: 'Earliest created first' },
    ],
  },
  {
    group: 'User fields',
    options: [
      { id: 'email.asc', label: 'Email A → Z', description: 'Alphabetical by email' },
      { id: 'email.desc', label: 'Email Z → A', description: 'Reverse alphabetical' },
      { id: 'display_name.asc', label: 'Name A → Z', description: 'Alphabetical by name' },
      { id: 'display_name.desc', label: 'Name Z → A', description: 'Reverse alphabetical' },
      { id: 'role.asc', label: 'Role A → Z', description: 'Alphabetical by role' },
      { id: 'role.desc', label: 'Role Z → A', description: 'Reverse alphabetical' },
    ],
  },
  {
    group: 'Usage',
    options: [
      { id: 'total_tokens.desc', label: 'Tokens high → low', description: 'Most tokens first' },
      { id: 'total_tokens.asc', label: 'Tokens low → high', description: 'Least tokens first' },
      {
        id: 'total_credits.desc',
        label: 'Credits high → low',
        description: 'Most credits spent first',
      },
      {
        id: 'total_credits.asc',
        label: 'Credits low → high',
        description: 'Least credits spent first',
      },
      {
        id: 'credits_remaining.desc',
        label: 'Credits left high → low',
        description: 'Most remaining balance first',
      },
      {
        id: 'credits_remaining.asc',
        label: 'Credits left low → high',
        description: 'Least remaining balance first',
      },
      { id: 'total_cost.desc', label: 'Cost high → low', description: 'Highest cost first' },
      { id: 'total_cost.asc', label: 'Cost low → high', description: 'Lowest cost first' },
    ],
  },
]

const ORG_SORT_OPTIONS: {
  group: string
  options: { id: OrgSort; label: string; description: string }[]
}[] = [
  {
    group: 'Created',
    options: [
      { id: 'created_at.desc', label: 'Newest first', description: 'Most recently created' },
      { id: 'created_at.asc', label: 'Oldest first', description: 'Earliest created first' },
    ],
  },
  {
    group: 'Org fields',
    options: [
      { id: 'name.asc', label: 'Name A → Z', description: 'Alphabetical by org name' },
      { id: 'name.desc', label: 'Name Z → A', description: 'Reverse alphabetical' },
      { id: 'slug.asc', label: 'Slug A → Z', description: 'Alphabetical by slug' },
      { id: 'slug.desc', label: 'Slug Z → A', description: 'Reverse alphabetical' },
      {
        id: 'account_type.asc',
        label: 'Account type A → Z',
        description: 'Alphabetical by account type',
      },
      {
        id: 'account_type.desc',
        label: 'Account type Z → A',
        description: 'Reverse alphabetical',
      },
      { id: 'status.asc', label: 'Status A → Z', description: 'Alphabetical by status' },
      { id: 'status.desc', label: 'Status Z → A', description: 'Reverse alphabetical' },
      { id: 'owner_email.asc', label: 'Owner email A → Z', description: 'Alphabetical' },
      { id: 'owner_email.desc', label: 'Owner email Z → A', description: 'Reverse alphabetical' },
    ],
  },
  {
    group: 'Usage',
    options: [
      { id: 'total_tokens.desc', label: 'Tokens high → low', description: 'Most tokens first' },
      { id: 'total_tokens.asc', label: 'Tokens low → high', description: 'Least tokens first' },
      {
        id: 'total_credits.desc',
        label: 'Credits high → low',
        description: 'Most credits spent first',
      },
      {
        id: 'total_credits.asc',
        label: 'Credits low → high',
        description: 'Least credits spent first',
      },
      {
        id: 'credits_remaining.desc',
        label: 'Credits left high → low',
        description: 'Most remaining balance first',
      },
      {
        id: 'credits_remaining.asc',
        label: 'Credits left low → high',
        description: 'Least remaining balance first',
      },
      { id: 'total_cost.desc', label: 'Cost high → low', description: 'Highest cost first' },
      { id: 'total_cost.asc', label: 'Cost low → high', description: 'Lowest cost first' },
    ],
  },
]

export function UsersHubToolbar({
  hubMode,
  searchValue,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  hasActiveFilters,
  activeDropdown,
  onSetActiveDropdown,
  currentSort,
  onSortChange,
  orgSort = 'created_at.desc',
  onOrgSortChange,
  onRefresh,
  columnVisibility,
  onColumnVisibilityChange,
}: UsersHubToolbarProps) {
  useEffect(() => {
    if (!activeDropdown) return
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('button')) {
        onSetActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [activeDropdown, onSetActiveDropdown])

  const handleDropdownClick = (dropdown: string) => {
    onSetActiveDropdown(activeDropdown === dropdown ? null : dropdown)
  }

  const handleSortSelect = (sortId: UserSort) => {
    onSortChange(sortId)
    onSetActiveDropdown(null)
  }

  const handleOrgSortSelect = (sortId: OrgSort) => {
    onOrgSortChange?.(sortId)
    onSetActiveDropdown(null)
  }

  const selectedRoleLabel = ROLE_OPTIONS.find((r) => r.id === roleFilter)?.label ?? 'All Roles'
  const selectedDateLabel = DATE_RANGE_OPTIONS.find((d) => d.id === dateRange)?.label ?? 'All Time'

  return (
    <div className="p-spacing-3 sm:p-spacing-4 surface-card border-border rounded-spacing-2 relative sticky top-0 z-20 border">
      <div className="gap-spacing-4 flex flex-col">
        <div className="gap-spacing-3 flex flex-wrap items-center">
          {/* Search */}
          <div className="relative w-48 min-w-[12rem]">
            <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
            <input
              type="text"
              placeholder={hubMode === 'orgs' ? 'Search org…' : 'Search users…'}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-glass input-leading h-spacing-8 pl-spacing-8 w-full"
            />
          </div>

          {hubMode === 'users' ? (
            <>
              {/* Role dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => handleDropdownClick('role')}
                  className="button-glass-blue gap-spacing-2 h-spacing-8 px-spacing-3 rounded-spacing-2 body-3 flex items-center font-medium"
                >
                  <span>{selectedRoleLabel}</span>
                  <ChevronDown className="icon-xs" />
                </button>
                {activeDropdown === 'role' && (
                  <div className="mt-spacing-1 z-dropdown absolute left-0 top-full" data-dropdown>
                    <div className="dropdown-menu-solid p-spacing-2 min-w-36">
                      {ROLE_OPTIONS.map((opt) => {
                        const isSelected = roleFilter === opt.id
                        return (
                          <button
                            key={opt.id ?? 'all'}
                            type="button"
                            onClick={() => {
                              onRoleFilterChange(opt.id)
                              onSetActiveDropdown(null)
                            }}
                            className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${
                              isSelected
                                ? 'bg-muted/50 text-foreground'
                                : 'hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="icon-sm text-primary shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Date range dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => handleDropdownClick('dateRange')}
                  className="button-glass-blue gap-spacing-2 h-spacing-8 px-spacing-3 rounded-spacing-2 body-3 flex items-center font-medium"
                >
                  <Calendar className="icon-sm" />
                  <span>{selectedDateLabel}</span>
                  <ChevronDown className="icon-xs" />
                </button>
                {activeDropdown === 'dateRange' && (
                  <div className="mt-spacing-1 z-dropdown absolute left-0 top-full" data-dropdown>
                    <div className="dropdown-menu-solid p-spacing-2 min-w-36">
                      {DATE_RANGE_OPTIONS.map((opt) => {
                        const isSelected = dateRange === opt.id
                        return (
                          <button
                            key={opt.id ?? 'all'}
                            type="button"
                            onClick={() => {
                              onDateRangeChange(opt.id)
                              onSetActiveDropdown(null)
                            }}
                            className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${
                              isSelected
                                ? 'bg-muted/50 text-foreground'
                                : 'hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="icon-sm text-primary shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="body-3 text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
          )}

          {/* Right side actions + Users / Orgs tabs */}
          <div className="gap-spacing-2 ml-auto flex flex-wrap items-center justify-end">
            <button
              type="button"
              onClick={() => handleDropdownClick('sort')}
              className="button-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 rounded-spacing-2 flex items-center font-medium"
              title="Sort"
            >
              <ArrowUpDown className="icon-sm" />
            </button>

            {hubMode === 'users' ? (
              <button
                type="button"
                onClick={() => handleDropdownClick('columns')}
                className="button-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 rounded-spacing-2 flex items-center font-medium"
                title="Columns"
              >
                <Columns className="icon-sm" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onRefresh?.()}
              className="button-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 rounded-spacing-2 flex items-center font-medium"
              title="Refresh"
            >
              <RefreshCcw className="icon-sm" />
            </button>

            <TabsList variant="liquid" className="h-spacing-8 shrink-0">
              <TabsTrigger
                value="users"
                className="px-spacing-3 sm:px-spacing-4 text-xs sm:text-sm"
              >
                Users
              </TabsTrigger>
              <TabsTrigger value="orgs" className="px-spacing-3 sm:px-spacing-4 text-xs sm:text-sm">
                Orgs
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Sort dropdown (users) */}
        {activeDropdown === 'sort' && hubMode === 'users' && (
          <div className="mt-spacing-1 z-dropdown absolute left-0 top-full" data-dropdown>
            <div className="dropdown-menu-solid p-spacing-2 max-h-64 min-w-48 overflow-y-auto">
              <h3 className="body-3 text-foreground px-spacing-2 py-spacing-1 mb-spacing-2 font-medium">
                Sort by
              </h3>
              {SORT_OPTIONS.map((group) => (
                <div key={group.group} className="space-y-spacing-1 mb-spacing-3">
                  <div className="typo-caption text-muted-foreground px-spacing-2 uppercase tracking-wider">
                    {group.group}
                  </div>
                  {group.options.map((opt) => {
                    const isSelected = currentSort === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSortSelect(opt.id)}
                        className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${
                          isSelected
                            ? 'bg-muted/50 text-foreground'
                            : 'hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{opt.label}</div>
                          <div className="typo-caption text-muted-foreground">
                            {opt.description}
                          </div>
                        </div>
                        {isSelected && <Check className="icon-sm text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sort dropdown (orgs) */}
        {activeDropdown === 'sort' && hubMode === 'orgs' && (
          <div className="mt-spacing-1 z-dropdown absolute left-0 top-full" data-dropdown>
            <div className="dropdown-menu-solid p-spacing-2 max-h-64 min-w-48 overflow-y-auto">
              <h3 className="body-3 text-foreground px-spacing-2 py-spacing-1 mb-spacing-2 font-medium">
                Sort by
              </h3>
              {ORG_SORT_OPTIONS.map((group) => (
                <div key={group.group} className="space-y-spacing-1 mb-spacing-3">
                  <div className="typo-caption text-muted-foreground px-spacing-2 uppercase tracking-wider">
                    {group.group}
                  </div>
                  {group.options.map((opt) => {
                    const isSelected = orgSort === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOrgSortSelect(opt.id)}
                        className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${
                          isSelected
                            ? 'bg-muted/50 text-foreground'
                            : 'hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{opt.label}</div>
                          <div className="typo-caption text-muted-foreground">
                            {opt.description}
                          </div>
                        </div>
                        {isSelected && <Check className="icon-sm text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Columns dropdown */}
        {activeDropdown === 'columns' && hubMode === 'users' && (
          <div className="mt-spacing-1 z-dropdown absolute right-0 top-full" data-dropdown>
            <div className="dropdown-menu-solid p-spacing-2 min-w-48">
              <h3 className="body-3 text-foreground px-spacing-2 py-spacing-1 mb-spacing-2 font-medium">
                Show columns
              </h3>
              <div className="space-y-spacing-1">
                {COLUMNS.map((col) => {
                  const isVisible = columnVisibility[col.id]
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => onColumnVisibilityChange(col.id, !isVisible)}
                      className="gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 hover:bg-muted/30 body-3 flex w-full cursor-pointer items-center text-left"
                    >
                      {isVisible ? (
                        <Check className="icon-sm text-primary" />
                      ) : (
                        <div className="icon-sm w-4" />
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
  )
}
