'use client'

import { FileText } from 'lucide-react'
import { formatFileSize } from '@/components/deliverables/deliverable-preview-modal.utils'
import { DELIVERABLE_ICONS, DELIVERABLE_TYPE_LABEL } from '@/lib/missions'
import type { MissionDeliverable } from '@/lib/missions'

export function DeliverablesListView({
  deliverables,
  onSelect,
}: {
  deliverables: MissionDeliverable[]
  onSelect: (d: MissionDeliverable) => void
}) {
  return (
    <div className="surface-card border-subtle rounded-spacing-3 flex min-h-0 flex-col overflow-hidden border">
      <div className="gap-spacing-3 border-border body-4 text-muted-foreground px-spacing-3 py-spacing-2 grid shrink-0 grid-cols-[1.6fr_0.7fr_0.5fr_0.6fr] border-b font-medium uppercase tracking-wide">
        <div>Name</div>
        <div>Type</div>
        <div>Size</div>
        <div>Created</div>
      </div>
      <div className="max-h-[min(40vh,22rem)] min-h-0 overflow-y-auto">
        {deliverables.map((d) => {
          const Icon = DELIVERABLE_ICONS[d.type] || FileText
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d)}
              className="gap-spacing-3 border-border body-4 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 grid w-full grid-cols-[1.6fr_0.7fr_0.5fr_0.6fr] items-center border-b text-left transition-colors last:border-b-0"
            >
              <div className="gap-spacing-2 flex min-w-0 items-center">
                <Icon className="icon-sm shrink-0 text-muted-foreground" />
                <span className="body-4 truncate font-medium">{d.title || 'Untitled'}</span>
              </div>
              <div className="body-4 text-muted-foreground min-w-0 truncate">
                {DELIVERABLE_TYPE_LABEL[d.type] || d.type}
              </div>
              <div className="text-muted-foreground tabular-nums">
                {d.file_size ? formatFileSize(d.file_size) : '—'}
              </div>
              <time
                dateTime={d.created_at}
                title={new Date(d.created_at).toLocaleString()}
                className="text-muted-foreground truncate tabular-nums"
              >
                {new Date(d.created_at).toLocaleString([], {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </time>
            </button>
          )
        })}
      </div>
    </div>
  )
}
