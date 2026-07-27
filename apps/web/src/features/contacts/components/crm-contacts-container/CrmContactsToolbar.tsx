import type { Dispatch, RefObject, SetStateAction } from 'react'
import { Check, ChevronDown, Filter, RefreshCw, Search } from 'lucide-react'
import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'
import type { CrmSort, CrmStatusFilter } from '../../services/crm-contacts-api'
import { COLUMN_OPTIONS, SORT_OPTIONS, type ColumnVisibility } from './crm-contacts-container-utils'

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
  dropdownRef,
  loading,
  onOpenFilters,
  onRefresh,
}: CrmContactsToolbarProps) {
  return (
    <div className="surface-card border-border rounded-spacing-2 p-spacing-3 sm:p-spacing-4 sticky top-0 z-20 border">
      <div className="gap-spacing-3 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="gap-spacing-2 flex flex-wrap items-center">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`pill pill--sm ${statusFilter === status ? 'pill--active' : ''}`}
            >
              <span className="relative z-10">{getStatusLabel(status)}</span>
            </button>
          ))}
        </div>

        <div className="gap-spacing-2 flex min-w-0 flex-wrap items-center" ref={dropdownRef}>
          <label className="relative block w-full md:w-80">
            <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              aria-label="Search contacts"
              className="input-leading h-spacing-9 pr-spacing-3 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-foreground w-full border outline-none"
            />
          </label>

          <button
            type="button"
            onClick={onOpenFilters}
            className="button-compact button-glass-secondary gap-spacing-2"
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

          <SettingsSelect
            value={sort}
            options={SORT_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
            onChange={setSort}
            ariaLabel="Sort contacts"
            wrapperClassName="relative w-44"
            triggerClassName="button-compact button-glass-secondary gap-spacing-2 w-full justify-between"
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setColumnsOpen((value) => !value)}
              className="button-compact button-glass-secondary gap-spacing-2"
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
                          aria-pressed={isVisible}
                          className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle flex w-full items-center text-left"
                        >
                          <span className="h-spacing-5 w-spacing-5 flex shrink-0 items-center justify-center">
                            {isVisible ? <Check className="icon-sm text-foreground" /> : null}
                          </span>
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
            className="button-compact button-glass-secondary gap-spacing-2"
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
