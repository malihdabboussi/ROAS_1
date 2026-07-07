'use client'

interface ConversationActionsQuickActionsProps {
  showCopyLink: boolean
  onCopyLink: () => void
  onCopyId?: () => void
  onOpenInNewTab?: () => void
  onClose: () => void
}

const QUICK_CELL_CLASS =
  'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'

export function ConversationActionsQuickActions({
  showCopyLink,
  onCopyLink,
  onCopyId,
  onOpenInNewTab,
  onClose,
}: ConversationActionsQuickActionsProps) {
  if (!showCopyLink && !onCopyId && !onOpenInNewTab) return null

  return (
    <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
      <div className="divide-border flex w-full divide-x">
        {showCopyLink ? (
          <button
            type="button"
            className={QUICK_CELL_CLASS}
            onClick={() => {
              onCopyLink()
              onClose()
            }}
          >
            Copy link
          </button>
        ) : null}
        {onCopyId ? (
          <button
            type="button"
            className={QUICK_CELL_CLASS}
            onClick={() => {
              onCopyId()
              onClose()
            }}
          >
            Copy ID
          </button>
        ) : null}
        {onOpenInNewTab ? (
          <button
            type="button"
            className={QUICK_CELL_CLASS}
            onClick={() => {
              onOpenInNewTab()
              onClose()
            }}
          >
            New tab
          </button>
        ) : null}
      </div>
    </div>
  )
}
