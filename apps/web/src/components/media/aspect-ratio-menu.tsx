'use client'

import { cn } from '@/lib/utils/cn'

/** ChatGPT-style aspect options: name + ratio + shape glyph. */
export const CHATGPT_STYLE_ASPECT_OPTIONS = [
  { ratio: '1:1', label: 'Square' },
  { ratio: '3:4', label: 'Portrait' },
  { ratio: '9:16', label: 'Story' },
  { ratio: '4:3', label: 'Landscape' },
  { ratio: '16:9', label: 'Widescreen' },
] as const

export type ChatGptStyleAspectRatio = (typeof CHATGPT_STYLE_ASPECT_OPTIONS)[number]['ratio']

export const ASPECT_RATIO_MENU_WIDTH = 260

const LABEL_BY_RATIO: Record<string, string> = {
  '1:1': 'Square',
  '3:4': 'Portrait',
  '2:3': 'Portrait',
  '9:16': 'Story',
  '4:3': 'Landscape',
  '3:2': 'Photo',
  '16:9': 'Widescreen',
}

export function aspectRatioLabel(ratio: string): string {
  return LABEL_BY_RATIO[ratio] ?? 'Custom'
}

/** Hollow rounded rect sized to the ratio (ChatGPT aspect picker). */
export function AspectRatioGlyph({
  ratio,
  className,
}: {
  ratio: string
  className?: string
}) {
  const parts = ratio.split(':').map(Number)
  const rw = parts[0] > 0 ? parts[0] : 1
  const rh = parts[1] > 0 ? parts[1] : 1
  const size = 16
  const pad = 1.5
  const max = size - pad * 2
  const scale = max / Math.max(rw, rh)
  const w = rw * scale
  const h = rh * scale
  const x = (size - w) / 2
  const y = (size - h) / 2

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn('text-muted-foreground h-4 w-4 shrink-0', className)}
      aria-hidden
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={1.75}
        ry={1.75}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
      />
    </svg>
  )
}

export function AspectRatioMenuOption({
  ratio,
  label,
  onSelect,
  selected,
}: {
  ratio: string
  label?: string
  onSelect: () => void
  selected?: boolean
}) {
  const name = label ?? aspectRatioLabel(ratio)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-2 flex w-full items-center text-left transition-colors',
        selected && 'bg-hover-subtle',
      )}
    >
      <AspectRatioGlyph ratio={ratio} />
      <span className="body-3 text-foreground min-w-0 font-medium">{name}</span>
      <span className="body-3 text-muted-foreground">{ratio}</span>
    </button>
  )
}
