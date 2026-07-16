'use client'

import {
  Bot,
  CheckSquare,
  FileText,
  Hash,
  LayoutGrid,
  MessageSquare,
  Rocket,
  User,
} from 'lucide-react'
import { OptionDot } from '@/components/ui/status/OptionBadge'
import type { EntitySearchKind, EntitySearchResult } from '../services/entity-search.service'

/** Default ROAS status palette (mirrors `StatusCell` defaults). */
const TASK_STATUS_COLOR: Record<string, string> = {
  todo: 'cyan',
  in_progress: 'amber',
  in_review: 'violet',
  done: 'emerald',
}

const KIND_LABELS: Record<EntitySearchKind, string> = {
  person: 'People',
  agent: 'Agents',
  task: 'Tasks',
  doc: 'Docs',
  channel: 'Channels',
  space: 'Spaces',
  mission: 'Missions',
  conversation: 'Conversations',
}

function EntityIcon({ kind, className }: { kind: EntitySearchKind; className?: string }) {
  const cls = className ?? 'h-3.5 w-3.5'
  if (kind === 'person') return <User className={cls} />
  if (kind === 'agent') return <Bot className={cls} />
  if (kind === 'task') return <CheckSquare className={cls} />
  if (kind === 'doc') return <FileText className={cls} />
  if (kind === 'channel') return <Hash className={cls} />
  if (kind === 'mission') return <Rocket className={cls} />
  if (kind === 'conversation') return <MessageSquare className={cls} />
  return <LayoutGrid className={cls} />
}

function EntityLeadGlyph({ item, className }: { item: EntitySearchResult; className?: string }) {
  if (item.kind === 'task') {
    const color = item.status ? (TASK_STATUS_COLOR[item.status] ?? undefined) : undefined
    return (
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
        <OptionDot color={color} size="sm" />
      </span>
    )
  }
  return (
    <EntityIcon
      kind={item.kind}
      className={className ?? 'text-muted-foreground h-3.5 w-3.5 shrink-0'}
    />
  )
}

interface EntityMentionPickerProps {
  items: EntitySearchResult[]
  selectedIndex: number
  onSelect: (item: EntitySearchResult) => void
  onHover: (index: number) => void
  /** When true, omit per-kind section headers and render compact single-line rows. */
  flat?: boolean
}

export function EntityMentionPicker({
  items,
  selectedIndex,
  onSelect,
  onHover,
  flat = false,
}: EntityMentionPickerProps) {
  if (flat) {
    const hasMultipleKinds = new Set(items.map((i) => i.kind)).size > 1
    return (
      <div className="py-1">
        {items.map((item, idx) => {
          const prev = idx > 0 ? items[idx - 1] : undefined
          const showKindHeader = hasMultipleKinds && (!prev || prev.kind !== item.kind)
          return (
            <div key={`${item.kind}:${item.id}`}>
              {showKindHeader && (
                <div
                  className={`px-spacing-3 typo-caption text-muted-foreground font-semibold ${
                    idx === 0 ? 'pb-spacing-1 pt-1' : 'pb-spacing-1 pt-spacing-2'
                  }`}
                >
                  {KIND_LABELS[item.kind]}
                </div>
              )}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(item)
                }}
                onMouseEnter={() => onHover(idx)}
                className={`px-spacing-3 gap-spacing-2 flex h-8 w-full items-center text-left transition-colors ${
                  idx === selectedIndex ? 'bg-hover-subtle' : 'hover:bg-hover-subtle'
                }`}
              >
                {item.iconUrl ? (
                  <img
                    src={item.iconUrl}
                    alt=""
                    className="h-4 w-4 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <EntityLeadGlyph item={item} />
                )}
                <span className="body-3 text-foreground min-w-0 flex-1 truncate">{item.label}</span>
                {item.subtitle && (
                  <span className="body-4 text-muted-foreground hidden shrink-0 truncate sm:inline">
                    {item.subtitle}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="py-spacing-1">
      {items.map((item, idx) => {
        const prev = idx > 0 ? items[idx - 1] : undefined
        const showHeader = !prev || prev.kind !== item.kind
        return (
          <div key={`${item.kind}:${item.id}`}>
            {showHeader && (
              <div
                className={`typo-caption text-muted-foreground px-spacing-3 pb-0.5 font-semibold ${
                  idx === 0 ? 'pt-1.5' : 'border-border mt-0.5 border-t pt-2'
                }`}
              >
                {KIND_LABELS[item.kind]}
              </div>
            )}
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
              {item.iconUrl ? (
                <img
                  src={item.iconUrl}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="bg-muted text-muted-foreground inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                  <EntityIcon kind={item.kind} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <span className="body-3 text-foreground block truncate font-medium">
                  {item.label}
                </span>
                {item.subtitle && (
                  <span className="body-4 text-muted-foreground block truncate">
                    {item.subtitle}
                  </span>
                )}
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
