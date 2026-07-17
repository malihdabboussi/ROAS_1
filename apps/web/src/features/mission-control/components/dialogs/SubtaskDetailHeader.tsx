import { ChevronRight, X } from 'lucide-react'

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
    <div className="gap-spacing-4 py-spacing-3 flex items-center justify-between">
      <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
        <button
          type="button"
          onClick={onBack}
          className="body-2 text-muted-foreground hover:text-foreground min-w-0 shrink truncate transition-colors"
        >
          {missionTitle}
        </button>
        <ChevronRight className="icon-sm text-muted-foreground shrink-0" aria-hidden />
        <h2 className="title-h2 text-foreground min-w-0 flex-1 truncate">{subtaskTitle}</h2>
      </div>
      <button type="button" onClick={onClose} className="btn-icon-bare shrink-0" aria-label="Close">
        <X className="icon-sm" />
      </button>
    </div>
  )
}
