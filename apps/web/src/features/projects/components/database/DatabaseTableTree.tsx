'use client'

import { RefreshCw, Table2 } from 'lucide-react'
import type { TableInfo } from '../../types'

interface DatabaseTableTreeProps {
  tables: TableInfo[]
  selectedTable: string | null
  onSelectTable: (name: string) => void
  onRefresh: () => void
  loading: boolean
}

export function DatabaseTableTree({
  tables,
  selectedTable,
  onSelectTable,
  onRefresh,
  loading,
}: DatabaseTableTreeProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-spacing-3 py-spacing-2 border-border flex items-center justify-between border-b">
        <span className="typo-caption text-muted-foreground font-medium uppercase tracking-wider">
          Tables
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="btn-icon-glass !h-6 !w-6"
          title="Refresh tables"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-spacing-1 flex-1 overflow-y-auto">
        {tables.length === 0 && !loading && (
          <div className="px-spacing-2 py-spacing-4 text-center">
            <p className="body-4 text-muted-foreground">No tables found</p>
          </div>
        )}
        {tables.map((table) => {
          const isSelected = selectedTable === table.name
          return (
            <button
              key={table.name}
              type="button"
              onClick={() => onSelectTable(table.name)}
              className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-4 mb-px flex w-full items-center text-left transition-all ${
                isSelected
                  ? 'chip-glass-blue text-foreground'
                  : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
              }`}
            >
              <Table2 className="icon-sm shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">{table.name}</span>
              <span className="typo-caption text-muted-foreground tabular-nums">
                {table.rowCount}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
