'use client'

import { memo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, Circle, ListTodo, Loader2, Minus, X } from 'lucide-react'

export type ChatPlanItemStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

export interface ChatPlanItem {
  id: string
  title: string
  status: ChatPlanItemStatus
  note?: string
}

export interface ChatPlanCardProps {
  planId: string
  title: string
  summary?: string
  items: ChatPlanItem[]
  planStatus: 'active' | 'completed' | 'cancelled'
  version: number
  /** Marks this block as a historical snapshot (superseded by a newer plan block) */
  isHistorical?: boolean
  /** Ref forwarded for IntersectionObserver (sticky tracker) */
  planRef?: React.Ref<HTMLDivElement>
}

const STATUS_CONFIG: Record<
  ChatPlanItemStatus,
  { icon: LucideIcon; className: string; label: string }
> = {
  pending: { icon: Circle, className: 'text-muted-foreground', label: 'Pending' },
  in_progress: { icon: Loader2, className: 'text-primary animate-spin', label: 'In progress' },
  completed: { icon: Check, className: 'text-success', label: 'Completed' },
  failed: { icon: X, className: 'text-destructive', label: 'Failed' },
  skipped: { icon: Minus, className: 'text-muted-foreground', label: 'Skipped' },
}

function PlanItemRow({ item }: { item: ChatPlanItem }) {
  const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending
  const Icon = config.icon
  const isDone = item.status === 'completed' || item.status === 'skipped'

  return (
    <div className="gap-spacing-3 px-spacing-3 py-spacing-2 flex items-start">
      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
        <Icon className={`h-4 w-4 ${config.className}`} />
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={`body-2 font-medium ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}
        >
          {item.title}
        </span>
        {item.note && <span className="body-3 text-muted-foreground ml-2">{item.note}</span>}
      </div>
    </div>
  )
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="gap-spacing-2 flex items-center">
      <div className="bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className="bg-primary absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="body-3 text-muted-foreground flex-shrink-0 tabular-nums">
        {completed}/{total}
      </span>
    </div>
  )
}

export const ChatPlanCard = memo(function ChatPlanCard(props: ChatPlanCardProps) {
  const {
    planId,
    title,
    summary,
    items,
    planStatus,
    version: _version,
    isHistorical,
    planRef,
  } = props

  const completed = items.filter((i) => i.status === 'completed').length
  const total = items.length
  const allDone = completed === total && total > 0

  if (planStatus === 'completed' || (allDone && !isHistorical)) {
    return (
      <div
        ref={planRef}
        data-plan-id={planId}
        className="surface-card mt-spacing-3 rounded-spacing-2 p-spacing-3 border border-success/20 bg-success/10"
      >
        <div className="gap-spacing-2 flex items-center">
          <Check className="icon-sm flex-shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <span className="body-2 text-foreground font-medium">{title}</span>
            <span className="body-3 text-muted-foreground ml-2">
              {total}/{total} completed
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (planStatus === 'cancelled') {
    return (
      <div
        ref={planRef}
        data-plan-id={planId}
        className="surface-card mt-spacing-3 rounded-spacing-2 border-muted-foreground/30 bg-muted/10 p-spacing-3 border"
      >
        <div className="gap-spacing-2 flex items-center">
          <X className="icon-sm text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="body-2 text-foreground font-medium">{title}</span>
            <span className="body-3 text-muted-foreground ml-2">Cancelled</span>
          </div>
        </div>
      </div>
    )
  }

  if (isHistorical) {
    return (
      <div
        ref={planRef}
        data-plan-id={planId}
        className="surface-card mt-spacing-3 rounded-spacing-2 border-border bg-muted/5 p-spacing-3 border opacity-60"
      >
        <div className="gap-spacing-2 flex items-center">
          <ListTodo className="icon-sm text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="body-2 text-foreground font-medium">{title}</span>
            <span className="body-3 text-muted-foreground ml-2">
              {completed}/{total} — updated later in conversation
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={planRef} data-plan-id={planId} className="mt-spacing-3">
      <div className="gap-spacing-2 mb-spacing-2 flex items-center">
        <ListTodo className="icon-sm text-muted-foreground flex-shrink-0" />
        <span className="body-3 text-muted-foreground">Plan</span>
      </div>

      <div className="surface-card border-border rounded-spacing-3 space-y-spacing-2 p-spacing-3 border">
        <div className="gap-spacing-1 flex flex-col">
          <span className="body-2 text-foreground font-medium">{title}</span>
          {summary && <span className="body-3 text-muted-foreground">{summary}</span>}
        </div>

        <ProgressBar completed={completed} total={total} />

        <div className="surface-card card-glass rounded-spacing-2 overflow-hidden">
          {items.map((item) => (
            <PlanItemRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
})
