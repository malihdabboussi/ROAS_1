import type { Dispatch, RefObject, SetStateAction } from 'react'
import { ChevronDown, Filter, RefreshCw, SlidersHorizontal } from 'lucide-react'
import type { CrmSort, CrmStatusFilter } from '../../services/crm-contacts-api'
import {
  COLUMN_OPTIONS,
  SORT_OPTIONS,
  type ColumnVisibility,
} from './crm-contacts-container-utils'

interface CrmContactsToolbarProps {
  search: string
  setSearch: (value: string) => void
  statusFilter: CrmStatusFilter
  setStatusFilter: (value: CrmStatusFilter) => void
  sort: CrmSort
  setSort: (value: CrmSort) => void
  columnVisibility: ColumnVisibility
  setColumnVisibility: Dispatch<SetStateAction<ColumnVisibility>>
  activeFilterCount: number
  columnsOpen: boolean
  setColumnsOpen: Dispatch<SetStateAction<boolean>>
  sortOpen: boolean
  setSortOpen: Dispatch<SetStateAction<boolean>>
  dropdownRef: RefObject<HTMLDivElement | null>
  loading: boolean
  onOpenFilters: () => void
  onRefresh: () => void
}

const STATUS_OPTIONS: CrmStatusFilter[] = ['all', 'lead', 'customer', 'archived']

function getStatusLabel(status: CrmStatusFilter): string {
  if (status === 'all') return 'All'
  if (status === 'lead') return 'Lead'
  if (status === 'customer') return 'Customer'
  return 'Archived'
}

export function CrmContactsToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  sort,
  setSort,
  columnVisibility,
  setColumnVisibility,
  activeFilterCount,
  columnsOpen,
  setColumnsOpen,
  sortOpen,
  setSortOpen,
  dropdownRef,
  loading,
  onOpenFilters,
  onRefresh,
}: CrmContactsToolbarProps) {
  return (
    <div className="surface-card border-border rounded-spacing-2 p-spacing-3 sm:p-spacing-4 sticky top-0 z-20 border">
      <div className="gap-spacing-3 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="gap-spacing-2 flex items-center">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`pill pill--sm ${statusFilter === status ? 'pill--active' : ''}`}
            >
              <span className="relative z-10">{getStatusLabel(status)}</span>
            </button>
          ))}
        </div>

        <div className="gap-spacing-2 flex items-center" ref={dropdownRef}>
          <div className="relative w-full md:w-[320px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="input-glass h-spacing-8 py-spacing-1 px-spacing-3 w-full"
            />
          </div>

          <button
            type="button"
            onClick={onOpenFilters}
            className="button-glass-blue h-spacing-10 px-spacing-3 gap-spacing-2 flex items-center rounded-lg font-medium"
            aria-label="Filters"
          >
            <span className="gap-spacing-2 relative z-10 flex items-center">
              <Filter className="icon-sm" />
              {activeFilterCount > 0 && (
                <span className="badge-glass badge-glass-sm badge-glass-blue">
                  {activeFilterCount}
                </span>
              )}
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSortOpen((value) => !value)
                setColumnsOpen(false)
              }}
              className="button-glass-blue h-spacing-10 px-spacing-3 gap-spacing-2 flex items-center rounded-lg font-medium"
              aria-label="Sort"
            >
              <span className="gap-spacing-2 relative z-10 flex items-center">
                <SlidersHorizontal className="icon-sm" />
                <ChevronDown className="icon-xs" />
              </span>
            </button>

            {sortOpen && (
              <div className="mt-spacing-1 z-dropdown absolute right-0 top-full">
                <div className="dropdown-menu-solid p-spacing-2 min-w-[220px]">
                  <div className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 uppercase">
                    Sort
                  </div>
                  <div className="mt-spacing-1 space-y-spacing-0">
                    {SORT_OPTIONS.map((option) => {
                      const selected = sort === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSort(option.id)
                            setSortOpen(false)
                          }}
                          className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 w-full text-left transition-all ${
                            selected
                              ? 'dropdown-option-selected text-muted-foreground'
                              : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setColumnsOpen((value) => !value)
                setSortOpen(false)
              }}
              className="button-glass-blue h-spacing-10 px-spacing-3 gap-spacing-2 flex items-center rounded-lg font-medium"
              aria-label="Columns"
            >
              <span className="gap-spacing-2 relative z-10 flex items-center">
                <span className="body-3">Columns</span>
                <ChevronDown className="icon-xs" />
              </span>
            </button>

            {columnsOpen && (
              <div className="mt-spacing-1 z-dropdown absolute right-0 top-full">
                <div className="dropdown-menu-solid p-spacing-2 min-w-[220px]">
                  <div className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 uppercase">
                    Show columns
                  </div>
                  <div className="mt-spacing-1 space-y-spacing-1">
                    {COLUMN_OPTIONS.map((column) => {
                      const isVisible = columnVisibility[column.id]
                      return (
                        <button
                          key={column.id}
                          type="button"
                          onClick={() =>
                            setColumnVisibility((prev) => ({
                              ...prev,
                              [column.id]: !prev[column.id],
                            }))
                          }
                          className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle flex w-full items-center text-left"
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            readOnly
                            className="accent-primary"
                          />
                          <span className="body-3 text-muted-foreground">{column.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="button-glass-blue h-spacing-10 px-spacing-3 gap-spacing-2 flex items-center rounded-lg font-medium"
            aria-label="Refresh"
            disabled={loading}
          >
            <span className="gap-spacing-2 relative z-10 flex items-center">
              <RefreshCw className={`icon-sm ${loading ? 'animate-spin' : ''}`} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
