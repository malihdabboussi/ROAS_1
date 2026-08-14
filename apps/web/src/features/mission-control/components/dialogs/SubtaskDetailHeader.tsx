import { ChevronRight, X } from 'lucide-react'
import { formatWebinarSubtaskTitle } from '@/lib/missions'

interface SubtaskDetailHeaderProps {
  missionTitle: string
  subtaskTitle: string
  onBack: () => void
  onClose: () => void
}

export function SubtaskDetailHeader({
  missionTitle,
  subtaskTitle,
  onBack,
  onClose,
}: SubtaskDetailHeaderProps) {
  return (
    <div className="gap-spacing-3 pb-spacing-2 flex items-start justify-between">
      <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={onBack}
          className="body-4 text-muted-foreground hover:text-foreground gap-spacing-1 flex max-w-full items-center truncate transition-colors"
        >
          <span className="truncate">{missionTitle}</span>
          <ChevronRight className="icon-xs shrink-0" aria-hidden />
        </button>
        <h2 className="title-h5 text-foreground min-w-0 truncate">
          {formatWebinarSubtaskTitle(subtaskTitle)}
        </h2>
      </div>
      <div className="gap-spacing-2 flex shrink-0 items-center">
        <button
          type="button"
          onClick={onClose}
          className="btn-icon-bare shrink-0"
          aria-label="Close"
        >
          <X className="icon-sm" />
        </button>
      </div>
    </div>
  )
}
