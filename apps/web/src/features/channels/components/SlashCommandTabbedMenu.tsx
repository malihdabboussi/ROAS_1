'use client'

import { Tooltip } from '@/components/ui/tooltip'
import type { SlashItem, SlashItemSection } from './slash-command-types'

const TAB_ORDER: SlashItemSection[] = ['actions', 'skills']

const TAB_LABELS: Record<SlashItemSection, string> = {
  actions: 'Actions',
  skills: 'Skills',
}

interface SlashCommandTabbedMenuProps {
  availableSections: SlashItemSection[]
  activeSection: SlashItemSection
  onSectionChange: (section: SlashItemSection) => void
  items: SlashItem[]
  selectedIndex: number
  queryLen: number
  onSelect: (item: SlashItem) => void
  onHover: (index: number) => void
}

export function SlashCommandTabbedMenu({
  availableSections,
  activeSection,
  onSectionChange,
  items,
  selectedIndex,
  queryLen,
  onSelect,
  onHover,
}: SlashCommandTabbedMenuProps) {
  const tabs = TAB_ORDER.filter((t) => availableSections.includes(t))
  return (
    <div className="flex min-w-0 flex-col">
      <div className="border-border scrollbar-thin gap-spacing-2 px-spacing-2 pt-spacing-2 flex max-w-[20rem] flex-nowrap overflow-x-auto border-b">
        {tabs.map((id) => {
          const active = id === activeSection
          return (
            <button
              key={id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSectionChange(id)}
              className={`body-4 pb-spacing-2 shrink-0 whitespace-nowrap border-b-2 font-medium transition-colors ${
                active
                  ? 'border-primary text-primary'
                  : 'hover:text-foreground text-muted-foreground border-transparent'
              }`}
            >
              {TAB_LABELS[id]}
            </button>
          )
        })}
      </div>
      <div className="text-muted-foreground px-spacing-3 py-spacing-2 typo-caption">
        {queryLen > 0 ? 'Filtered commands' : 'Commands'}
      </div>
      <div className="dropdown-list-scroll max-h-[min(16rem,40vh)] min-h-[4rem]">
        {items.length > 0 ? (
          <div className="py-spacing-1">
            {items.map((item, idx) => {
              const Icon = item.icon
              const row = (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onSelect(item)
                  }}
                  onMouseEnter={() => onHover(idx)}
                  className={`px-spacing-3 py-spacing-2 flex w-full items-center gap-2.5 text-left transition-colors ${
                    idx === selectedIndex ? 'bg-hover-subtle' : 'hover:bg-hover-subtle'
                  }`}
                >
                  <span className="bg-muted text-muted-foreground inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="body-3 text-foreground block truncate font-medium">
                      {item.label}
                    </span>
                    {item.description ? (
                      <span className="body-4 text-muted-foreground block truncate">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
              if (!item.description?.trim()) {
                return (
                  <div key={item.id} className="w-full">
                    {row}
                  </div>
                )
              }
              return (
                <Tooltip
                  key={item.id}
                  label={item.description}
                  side="right"
                  wide
                  delayMs={180}
                  triggerClassName="block w-full"
                >
                  {row}
                </Tooltip>
              )
            })}
          </div>
        ) : (
          <div className="px-spacing-3 py-spacing-3 body-3 text-muted-foreground">
            {queryLen > 0 ? 'No commands match in this tab.' : 'Nothing in this tab.'}
          </div>
        )}
      </div>
      <div className="border-border px-spacing-3 py-spacing-2 typo-caption text-muted-foreground gap-x-spacing-2 flex flex-wrap gap-y-1 border-t">
        <span>←→ tabs</span>
        <span aria-hidden>|</span>
        <span>↑↓ navigate</span>
        <span aria-hidden>|</span>
        <span>Enter select</span>
        <span aria-hidden>|</span>
        <span>Esc close</span>
      </div>
    </div>
  )
}
