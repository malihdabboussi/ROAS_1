'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { FieldType } from '../../../../types/space-schema'
import { filterCreatableTypes } from './field-type-catalog'

interface CreateNewFieldListProps {
  searchQuery: string
  onPickType: (type: FieldType) => void
}

export function CreateNewFieldList({ searchQuery, onPickType }: CreateNewFieldListProps) {
  const items = filterCreatableTypes(searchQuery)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="px-2 pb-3">
      <div className="sticky top-0 z-10 -mx-2 flex items-center justify-between bg-[var(--background)] px-2 py-1">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          aria-expanded={!collapsed}
        >
          <span className="body-3 font-medium">All</span>
          <ChevronDown
            className={cn('h-3 w-3 shrink-0 transition-transform', collapsed && '-rotate-90')}
            aria-hidden
          />
        </button>
      </div>
      {!collapsed && (
        <div className="space-y-0.5">
          {items.map((meta) => {
            const Icon = meta.icon
            return (
              <button
                key={meta.type}
                type="button"
                onClick={() => onPickType(meta.type)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                <span className="body-3 min-w-0 flex-1 truncate text-[var(--foreground)]">
                  {meta.label}
                </span>
              </button>
            )
          })}
          {items.length === 0 && (
            <p className="body-3 px-3 py-2 text-[var(--color-muted-foreground)]">
              No matching field types
            </p>
          )}
        </div>
      )}
    </div>
  )
}
