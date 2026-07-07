'use client'

import {
  DELIVERABLE_TYPE_BADGE,
  DELIVERABLE_TYPE_LABEL,
} from '@/lib/missions'
import { formatFileSize } from '@/components/deliverables/deliverable-preview-modal.utils'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { MissionDeliverable } from '@/lib/missions'

export function DeliverablePreviewMetaRow({
  agent,
  deliverable,
}: {
  agent: MissionAgent | undefined
  deliverable: MissionDeliverable
}) {
  return (
    <div className="gap-spacing-3 flex min-w-0 flex-1 flex-wrap items-center">
      {agent && (
        <div className="gap-spacing-2 flex items-center">
          {agent.image_url ? (
            <img
              src={agent.image_url}
              alt={agent.name}
              className="h-spacing-5 aspect-square rounded-full object-cover"
            />
          ) : (
            <div className="bg-primary/20 text-primary typo-caption h-spacing-5 flex aspect-square items-center justify-center rounded-full font-bold">
              {agent.name.charAt(0)}
            </div>
          )}
          <span className="body-3 text-foreground">{agent.name}</span>
        </div>
      )}
      <span
        className={`${DELIVERABLE_TYPE_BADGE[deliverable.type] || 'badge-glass badge-glass-muted'} typo-caption font-medium`}
      >
        {DELIVERABLE_TYPE_LABEL[deliverable.type] || deliverable.type}
      </span>
      {deliverable.file_name && (
        <span className="body-4 text-muted-foreground max-w-[200px] truncate">
          {deliverable.file_name}
        </span>
      )}
      {deliverable.file_size && (
        <span className="body-4 text-muted-foreground">
          {formatFileSize(deliverable.file_size)}
        </span>
      )}
      <span className="body-4 text-muted-foreground">
        {new Date(deliverable.created_at).toLocaleDateString()}
      </span>
    </div>
  )
}

export default DeliverablePreviewMetaRow
