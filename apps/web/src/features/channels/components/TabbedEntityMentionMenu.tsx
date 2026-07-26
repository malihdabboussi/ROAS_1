'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { EntitySearchKind, EntitySearchResult } from '../services/entity-search.service'
import { EntityMentionPicker } from './EntityMentionPicker'

export type EntityMentionUiTab =
  | 'people'
  | 'agents'
  | 'tasks'
  | 'docs'
  | 'channels'
  | 'spaces'
  | 'missions'
  | 'conversations'

export const ENTITY_MENTION_TAB_TYPES: Record<EntityMentionUiTab, EntitySearchKind[]> = {
  people: ['person'],
  agents: ['agent'],
  tasks: ['task'],
  docs: ['doc'],
  channels: ['channel'],
  spaces: ['space'],
  missions: ['mission'],
  conversations: ['conversation'],
}

const TABS: { id: EntityMentionUiTab; label: string }[] = [
  { id: 'people', label: 'People' },
  { id: 'agents', label: 'Agents' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'docs', label: 'Docs' },
  { id: 'channels', label: 'Channels' },
  { id: 'spaces', label: 'Spaces' },
  { id: 'missions', label: 'Missions' },
  { id: 'conversations', label: 'Conversations' },
]

interface TabbedEntityMentionMenuProps {
  activeTab: EntityMentionUiTab
  onTabChange: (tab: EntityMentionUiTab) => void
  items: EntitySearchResult[]
  selectedIndex: number
  queryLen: number
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSelect: (item: EntitySearchResult) => void
  onHover: (index: number) => void
}

type PeopleFilter = 'all' | 'internal' | 'external' | 'portal'

function matchesPeopleFilter(item: EntitySearchResult, filter: PeopleFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'portal') return item.personKind === 'portal_user'
  return item.personKind === 'managed_person' && item.relationshipKind === filter
}

export function TabbedEntityMentionMenu({
  activeTab,
  onTabChange,
  items,
  selectedIndex,
  queryLen,
  loading,
  hasMore,
  onLoadMore,
  onSelect,
  onHover,
}: TabbedEntityMentionMenuProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>('all')
  const visibleItems = useMemo(() => {
    if (activeTab !== 'people') return items
    return items.filter((item) => matchesPeopleFilter(item, peopleFilter))
  }, [activeTab, items, peopleFilter])
  const visibleSelectedIndex = Math.max(
    0,
    visibleItems.findIndex((item) => item === items[selectedIndex]),
  )

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = 0
  }, [activeTab, queryLen])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || loading || !hasMore) return
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    if (remaining < 80) onLoadMore()
  }

  const showInitialLoading = loading && items.length === 0
  const showEmpty = !loading && items.length === 0

  return (
    <div className="flex min-w-0 flex-col">
      <div className="border-border scrollbar-thin gap-spacing-5 px-spacing-4 pt-spacing-2 flex flex-nowrap overflow-x-auto border-b">
        {TABS.map(({ id, label }) => {
          const active = id === activeTab
          return (
            <button
              key={id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onTabChange(id)}
              className={`body-4 pb-spacing-2 shrink-0 whitespace-nowrap border-b-2 font-medium transition-colors ${
                active
                  ? 'border-primary text-primary'
                  : 'hover:text-foreground text-muted-foreground border-transparent'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="scrollbar-thin overflow-y-auto"
        style={{ height: 'min(18rem, 45vh)' }}
      >
        {activeTab === 'people' && (
          <div className="border-border gap-spacing-1 px-spacing-3 py-spacing-2 flex border-b">
            {(
              [
                ['all', 'All'],
                ['internal', 'Internal'],
                ['external', 'External'],
                ['portal', 'Portal users'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setPeopleFilter(id)
                  const firstIndex = items.findIndex((item) => matchesPeopleFilter(item, id))
                  if (firstIndex >= 0) onHover(firstIndex)
                }}
                className={`button-compact px-spacing-3 ${
                  peopleFilter === id ? 'button-glass-primary' : 'button-glass-neutral'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {showInitialLoading ? (
          <div className="body-3 text-muted-foreground px-spacing-3 py-spacing-6 gap-spacing-2 flex min-h-[min(18rem,45vh)] flex-col items-center justify-center text-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : showEmpty || visibleItems.length === 0 ? (
          <div className="body-3 text-muted-foreground px-spacing-3 py-spacing-6 flex min-h-[min(18rem,45vh)] flex-col items-center justify-center text-center">
            {queryLen === 0 ? 'Nothing here yet.' : 'No matches in this category.'}
          </div>
        ) : (
          <>
            <EntityMentionPicker
              flat
              items={visibleItems}
              selectedIndex={visibleSelectedIndex}
              onSelect={onSelect}
              onHover={(visibleIndex) => {
                const item = visibleItems[visibleIndex]
                const sourceIndex = item ? items.indexOf(item) : -1
                if (sourceIndex >= 0) onHover(sourceIndex)
              }}
            />
            {loading && (
              <div className="px-spacing-3 py-spacing-2 gap-spacing-2 body-4 text-muted-foreground flex items-center justify-center">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading more…
              </div>
            )}
            {!loading && !hasMore && items.length > 0 && (
              <div className="px-spacing-3 py-spacing-2 typo-caption text-muted-foreground text-center">
                End of list
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
