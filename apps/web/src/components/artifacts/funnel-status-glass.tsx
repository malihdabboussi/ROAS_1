import { cn } from '@/lib/utils/cn'

export function funnelStatusGlassClass(statusRaw: string): string {
  const key = statusRaw.trim().toLowerCase()
  if (key === 'published') return 'badge-glass-green'
  if (key === 'generated') return 'badge-glass-blue'
  if (key === 'paused') return 'badge-glass-orange'
  if (key === 'archived') return 'badge-glass-red'
  return 'badge-glass-muted'
}

export function funnelStatusDisplayLabel(statusRaw: string): string {
  const s = statusRaw.trim()
  if (!s) return 'Draft'
  const lower = s.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

type FunnelStatusGlassCapsuleProps = {
  status: string
  /** Tailwind group variant on an ancestor (`group/artifact` or `group/funnel-toolbar`). */
  hoverVariant: 'artifact' | 'funnel-toolbar'
}

/**
 * Glass `badge-glass-*` orb plus label on group hover.
 * Toolbar: dot then label. Card: label then dot.
 */
export function FunnelStatusGlassCapsule({ status, hoverVariant }: FunnelStatusGlassCapsuleProps) {
  const label = funnelStatusDisplayLabel(status)
  const hover =
    hoverVariant === 'artifact'
      ? 'group-hover/artifact:max-w-28 group-hover/artifact:opacity-100'
      : 'group-hover/funnel-toolbar:max-w-28 group-hover/funnel-toolbar:opacity-100'

  const labelEl = (
    <span
      className={cn(
        'body-3 text-muted-foreground max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-200 ease-out',
        hover,
      )}
    >
      {label}
    </span>
  )

  const dotEl = (
    <span
      className={cn('h-2 w-2 shrink-0 rounded-full', funnelStatusGlassClass(status))}
      aria-hidden
    />
  )

  return (
    <span
      className="gap-spacing-1 inline-flex min-w-0 shrink-0 items-center"
      aria-label={`Status ${label}`}
    >
      {hoverVariant === 'funnel-toolbar' ? (
        <>
          {dotEl}
          {labelEl}
        </>
      ) : (
        <>
          {labelEl}
          {dotEl}
        </>
      )}
    </span>
  )
}
