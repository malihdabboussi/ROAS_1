import { X } from 'lucide-react'
import type { MessageReference } from '../../types'

function visibleReferenceChips(references: MessageReference[]): MessageReference[] {
  return references.filter(
    (ref) =>
      (ref.kind !== 'conversation' || ref.type?.startsWith('message:')) &&
      (ref.kind !== 'artifact' || ref.campaign_id),
  )
}

export function ChatInputReferenceChips({
  references,
  chipRowClassName,
  onRemove,
}: {
  references: MessageReference[]
  chipRowClassName: string
  onRemove: (ref: MessageReference) => void
}) {
  const visible = visibleReferenceChips(references)
  if (visible.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${chipRowClassName}`}>
      {visible.map((ref) => (
        <div
          key={`${ref.kind}-${ref.id}`}
          className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm ${
            ref.kind === 'media'
              ? 'badge-glass badge-glass-cyan'
              : ref.kind === 'person'
                ? 'badge-glass badge-glass-green'
                : 'badge-glass badge-glass-orange'
          }`}
        >
          <span className="max-w-36 truncate" title={ref.label}>
            {ref.label}
          </span>
          <button
            type="button"
            onClick={() => onRemove(ref)}
            className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`Remove ${ref.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
