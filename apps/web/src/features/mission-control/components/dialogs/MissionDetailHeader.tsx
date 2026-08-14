'use client'

import { useRef, type ReactNode } from 'react'
import { MoreHorizontal, X } from 'lucide-react'

interface MissionDetailHeaderProps {
  title: string
  onTitleChange: (value: string) => void
  onClose: () => void
  onOpenMenu?: (anchor: HTMLElement) => void
  actions?: ReactNode
}

export function MissionDetailHeader({
  title,
  onTitleChange,
  onClose,
  onOpenMenu,
  actions,
}: MissionDetailHeaderProps) {
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="gap-spacing-4 py-spacing-3 flex items-center justify-between">
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="title-h2 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
        placeholder="Mission title"
        readOnly
      />
      <div className="gap-spacing-2 flex shrink-0 items-center">
        {onOpenMenu ? (
          <span className="tooltip" data-tooltip="More">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => menuButtonRef.current && onOpenMenu(menuButtonRef.current)}
              className="btn-icon-bare shrink-0"
              aria-label="More actions"
            >
              <MoreHorizontal className="icon-sm" />
            </button>
          </span>
        ) : null}
        {actions}
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
