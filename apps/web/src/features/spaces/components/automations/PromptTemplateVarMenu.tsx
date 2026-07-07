'use client'

import type { ComponentType } from 'react'
import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { TemplateVarMenuGroup } from './automation-catalog'
import type { TokenSourceKey, VarItem } from './PromptTemplateEditor'

function labelMenuText(label: string): string {
  const t = label.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function PromptTemplateVarMenu({
  groups,
  activeIndex,
  tokenSourceIcon,
  onHoverIndex,
  onSelect,
}: {
  groups: TemplateVarMenuGroup[]
  activeIndex: number
  tokenSourceIcon: (source?: TokenSourceKey) => ComponentType<{ className?: string }> | null
  onHoverIndex: (index: number) => void
  onSelect: (item: VarItem) => void
}) {
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set())

  const visibleRows = useMemo(() => {
    const rows: Array<{ group: TemplateVarMenuGroup; item: VarItem; flatIdx: number }> = []
    let flatIdx = 0
    for (const group of groups) {
      if (collapsedGroupIds.has(group.id)) continue
      for (const item of group.items) {
        rows.push({ group, item, flatIdx })
        flatIdx += 1
      }
    }
    return rows
  }, [collapsedGroupIds, groups])

  const rowsByGroup = useMemo(() => {
    const map = new Map<string, Array<{ item: VarItem; flatIdx: number }>>()
    for (const row of visibleRows) {
      const existing = map.get(row.group.id) ?? []
      existing.push({ item: row.item, flatIdx: row.flatIdx })
      map.set(row.group.id, existing)
    }
    return map
  }, [visibleRows])

  function toggleGroup(groupId: string) {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  if (groups.length === 0) {
    return (
      <p className="body-3 text-muted-foreground py-spacing-2 text-center">
        No matches — keep typing or press Esc
      </p>
    )
  }

  return (
    <div role="listbox" aria-label="Insert variable">
      {groups.map((group) => {
        const expanded = !collapsedGroupIds.has(group.id)
        const groupItems = rowsByGroup.get(group.id) ?? []

        return (
          <section key={group.id} className="border-border border-b last:border-b-0">
            <button
              type="button"
              className="surface-bg gap-spacing-2 sticky top-0 z-10 flex w-full items-center px-spacing-2 py-spacing-2 text-left"
              aria-expanded={expanded}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleGroup(group.id)}
            >
              <ChevronDown
                className={cn(
                  'icon-xs text-muted-foreground shrink-0 transition-transform',
                  !expanded && '-rotate-90',
                )}
              />
              <span className="body-3 text-foreground min-w-0 flex-1 truncate font-medium">
                {group.label}
              </span>
              <span className="typo-caption text-muted-foreground shrink-0">{group.items.length}</span>
            </button>
            {expanded ? (
              <div className="pb-spacing-1">
                {groupItems.map(({ item, flatIdx }) => {
                  const ItemIcon = tokenSourceIcon(item.source)
                  return (
                    <button
                      key={item.token}
                      type="button"
                      role="option"
                      aria-selected={flatIdx === activeIndex}
                      data-mention-idx={flatIdx}
                      onMouseEnter={() => onHoverIndex(flatIdx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSelect(item)}
                      className={cn(
                        'gap-x-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 grid w-full grid-cols-[16px_minmax(0,7rem)_minmax(0,1fr)] items-center text-left transition-colors',
                        flatIdx === activeIndex ? 'bg-hover-subtle' : 'hover:bg-hover-subtle',
                      )}
                    >
                      <span className="text-muted-foreground inline-flex h-4 w-4 items-center justify-center">
                        {ItemIcon ? <ItemIcon className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="body-3 text-muted-foreground min-w-0 truncate font-medium">
                        {labelMenuText(item.label)}
                      </span>
                      <span className="typo-caption text-muted-foreground min-w-0 truncate text-left leading-snug">
                        {item.detail}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
