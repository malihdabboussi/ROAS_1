import { ArrowLeft, X } from 'lucide-react'

export function CustomizePanelSubViewHeader({
  title,
  onBack,
  onClose,
}: {
  title: string
  onBack: () => void
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="body-3 font-semibold text-[var(--foreground)]">{title}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
