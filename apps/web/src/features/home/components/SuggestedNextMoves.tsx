'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, Clock3, Sparkles, X, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { NEXT_MOVES_MESSAGES } from '@/features/home/config/next-moves-messages.config'
import {
  fetchNextMoves,
  snoozeNextMove,
  type SuggestedNextMove,
} from '@/features/home/services/next-moves.service'
import { useOrgStore } from '@/lib/org'

const COLLAPSED_COUNT = 3

/** One glyph per surface a suggestion can come from — the "where" at a glance. */
const SOURCE_ICONS: Record<SuggestedNextMove['source']['type'], LucideIcon> = {
  meeting: CalendarDays,
}

function suggestionReason(item: SuggestedNextMove): string {
  const date = formatSourceDate(item.source.occurredAt)
  if (item.source.type === 'meeting') {
    return `Suggested because it came up in your "${item.source.title}" meeting on ${date}`
  }
  return `${NEXT_MOVES_MESSAGES.sourcePrefix} ${item.source.title} · ${date}`
}

export function SuggestedNextMoves({
  onSelectPrompt,
}: {
  onSelectPrompt?: (prompt: string) => void
} = {}) {
  const router = useRouter()
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const [items, setItems] = useState<SuggestedNextMove[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setItems([])
    setExpanded(false)
    void fetchNextMoves()
      .then((result) => {
        if (!cancelled) setItems(result?.suggestions ?? [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [activeOrgId])

  const remove = useCallback(async (item: SuggestedNextMove, duration: 'week' | 'dismiss') => {
    try {
      await snoozeNextMove(item.id, duration)
      setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    } catch {
      toast.error(NEXT_MOVES_MESSAGES.snoozeFailed)
    }
  }, [])

  if (items.length === 0) return null

  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT)
  const hiddenCount = items.length - visible.length

  return (
    <section aria-label={NEXT_MOVES_MESSAGES.eyebrow}>
      <div className="flex flex-col">
        {visible.map((item) => {
          const Icon = SOURCE_ICONS[item.source.type] ?? Sparkles
          return (
            <article
              key={item.id}
              className="hover:bg-hover-subtle gap-spacing-2 px-spacing-2 group flex items-center rounded-lg transition-colors"
            >
              <Tooltip
                label={suggestionReason(item)}
                wide
                delayMs={350}
                triggerClassName="min-w-0 flex-1"
              >
                <button
                  type="button"
                  aria-label={`${onSelectPrompt ? 'Use' : 'Open'} suggestion: ${item.title}`}
                  className="gap-spacing-2 py-spacing-2 flex w-full min-w-0 items-center text-left"
                  onClick={() => {
                    if (onSelectPrompt) {
                      onSelectPrompt(item.prompt)
                      return
                    }
                    router.push(
                      `/spaces?space=${encodeURIComponent(item.source.spaceId)}&item=${encodeURIComponent(item.source.meetingItemId)}`,
                    )
                  }}
                >
                  <Icon className="icon-sm text-muted-foreground shrink-0" aria-hidden="true" />
                  <span className="body-3 text-foreground truncate">{item.title}</span>
                  <span className="sr-only">{suggestionReason(item)}</span>
                </button>
              </Tooltip>

              <div className="gap-spacing-1 flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  className="btn-icon-bare"
                  aria-label={`Snooze ${item.title}`}
                  title="Snooze for a week"
                  onClick={() => void remove(item, 'week')}
                >
                  <Clock3 className="icon-xs" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn-icon-bare"
                  aria-label={`${NEXT_MOVES_MESSAGES.dismiss} ${item.title}`}
                  title={NEXT_MOVES_MESSAGES.dismiss}
                  onClick={() => void remove(item, 'dismiss')}
                >
                  <X className="icon-xs" aria-hidden="true" />
                </button>
              </div>
            </article>
          )
        })}
        {hiddenCount > 0 || expanded ? (
          <button
            type="button"
            className="body-4 text-muted-foreground hover:text-foreground gap-spacing-1 px-spacing-2 py-spacing-2 flex items-center self-start transition-colors"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
          >
            <ChevronDown
              className={`icon-xs transition-transform ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            {expanded ? 'See less' : `See more (${hiddenCount})`}
          </button>
        ) : null}
      </div>
    </section>
  )
}

function formatSourceDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recent call'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}
