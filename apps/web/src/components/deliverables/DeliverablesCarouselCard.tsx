'use client'

import { FileText, ImageIcon } from 'lucide-react'
import {
  isDocxDeliverable,
  isPdfDeliverable,
} from '@/components/deliverables/deliverable-docx.utils'
import { FileThumbnail } from '@/components/deliverables/DeliverablesCarouselThumbnail'
import {
  DELIVERABLE_TYPE_LABEL,
  DeliverableIcon,
  DeliverableTypeIconBadge,
} from '@/lib/missions'
import type { MissionDeliverable } from '@/lib/missions'

export function TaskSectionDeliverablesEmptyMockup() {
  return (
    <div aria-hidden className="relative mx-auto h-36 w-64 select-none">
      <div className="h-spacing-24 w-spacing-24 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-2xl" />

      <div className="card-glass h-spacing-24 w-spacing-20 rounded-spacing-2 left-spacing-2 top-spacing-10 absolute flex -rotate-6 flex-col overflow-hidden opacity-35 shadow-lg">
        <div className="bg-muted-20 flex flex-1 items-center justify-center">
          <ImageIcon className="icon-sm text-muted-foreground opacity-50" />
        </div>
        <div className="px-spacing-2 py-spacing-1">
          <div className="bg-muted-foreground h-spacing-1 w-3/4 rounded-full opacity-15" />
        </div>
      </div>

      <div className="card-glass h-spacing-24 w-spacing-20 rounded-spacing-2 right-spacing-2 top-spacing-8 absolute flex rotate-6 flex-col overflow-hidden opacity-35 shadow-lg">
        <div className="bg-muted-20 p-spacing-2 flex flex-1 items-center justify-center">
          <FileText className="icon-sm text-muted-foreground opacity-50" />
        </div>
        <div className="px-spacing-2 py-spacing-1">
          <div className="bg-muted-foreground h-spacing-1 w-2/3 rounded-full opacity-15" />
        </div>
      </div>

      <div className="card-glass h-spacing-32 w-spacing-24 rounded-spacing-2 absolute left-1/2 top-0 flex -translate-x-1/2 flex-col overflow-hidden shadow-xl">
        <div className="bg-muted-20 relative flex flex-[3] items-center justify-center overflow-hidden">
          <FileText className="icon-md text-muted-foreground opacity-45" />
        </div>
        <div className="gap-spacing-1 border-border px-spacing-2 py-spacing-2 flex flex-[2] flex-col justify-center border-t">
          <div className="bg-muted-foreground h-spacing-1.5 w-full rounded-full opacity-20" />
          <div className="bg-muted-foreground h-spacing-1 w-2/3 rounded-full opacity-10" />
        </div>
      </div>
    </div>
  )
}

function hasFileThumbnail(deliverable: MissionDeliverable): boolean {
  const thumbFromMeta = typeof deliverable.metadata?.thumbnail === 'string'
  return (
    !!deliverable.entity_id ||
    (deliverable.type === 'image' && !!deliverable.file_url) ||
    thumbFromMeta ||
    (deliverable.type === 'video' && !!deliverable.file_url) ||
    (isDocxDeliverable(deliverable) && !!deliverable.file_url) ||
    (isPdfDeliverable(deliverable) && !!deliverable.file_url) ||
    !!deliverable.content?.trim()
  )
}

export function CoreDeliverableCard({
  deliverable,
  onSelect,
  iconBesideTitle = false,
}: {
  deliverable: MissionDeliverable
  onSelect: (d: MissionDeliverable) => void
  iconBesideTitle?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(deliverable)}
      title={deliverable.title}
      className="card-glass h-spacing-60 w-spacing-60 rounded-spacing-2 hover:bg-secondary flex shrink-0 flex-col overflow-hidden transition-colors"
    >
      <div className="bg-muted-20 relative min-h-0 flex-[8] overflow-hidden">
        {hasFileThumbnail(deliverable) ? (
          <FileThumbnail deliverable={deliverable} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <DeliverableIcon type={deliverable.type} size="md" />
          </div>
        )}
      </div>
      <div
        className={
          iconBesideTitle
            ? 'gap-spacing-2 px-spacing-2 py-spacing-2 flex flex-[2] items-center overflow-hidden'
            : 'gap-spacing-1 px-spacing-2 py-spacing-1 flex flex-[2] flex-col justify-center overflow-hidden'
        }
      >
        {iconBesideTitle ? <DeliverableTypeIconBadge type={deliverable.type} /> : null}
        <span className="body-3 min-w-0 truncate font-medium text-foreground">
          {deliverable.title || 'Untitled'}
        </span>
        {!iconBesideTitle ? (
          <span className="body-4 text-muted-foreground shrink-0 self-start">
            {DELIVERABLE_TYPE_LABEL[deliverable.type] || deliverable.type}
          </span>
        ) : null}
      </div>
    </button>
  )
}
