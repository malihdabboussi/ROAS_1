'use client'

import { Loader2, type LucideIcon } from 'lucide-react'

export function DropboxFileBrowserActionButton({
  icon: Icon,
  label,
  onClick,
  loading,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  loading?: boolean
}) {
  const cls =
    'tooltip flex h-7 w-7 items-center justify-center rounded-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground transition-colors'
  const inner = loading ? (
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
  ) : (
    <Icon className="h-3.5 w-3.5" />
  )

  return (
    <button type="button" onClick={onClick} disabled={loading} className={cls} data-tooltip={label}>
      {inner}
    </button>
  )
}
