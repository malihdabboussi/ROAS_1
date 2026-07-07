'use client'

import { cn } from '@/lib/utils/cn'

export function HtmlMiniIframe({
  html,
  title,
  className,
  interactive = false,
}: {
  html: string
  title: string
  className?: string
  /** When true, the iframe fills the preview and handles its own scrolling/interactions. */
  interactive?: boolean
}) {
  if (interactive) {
    return (
      <div className={cn('min-h-0 h-full w-full flex-1 overflow-hidden', className)}>
        <iframe
          title={title}
          srcDoc={html}
          sandbox="allow-same-origin"
          className="h-full min-h-0 w-full border-0"
        />
      </div>
    )
  }

  return (
    <div className={cn('relative min-h-0 h-full w-full flex-1', className)}>
      <iframe
        title={title}
        srcDoc={html}
        sandbox="allow-same-origin"
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
      />
    </div>
  )
}
