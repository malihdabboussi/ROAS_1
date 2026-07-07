export const DOC_SURFACE_KEYS = [
  'blue',
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'gray',
] as const
export type DocSurfaceKey = (typeof DOC_SURFACE_KEYS)[number]

export const DOC_SURFACE_PRESETS: Record<DocSurfaceKey, { bg: string; label: string }> = {
  blue: { bg: 'rgba(59, 130, 246, 0.22)', label: 'Blue' },
  green: { bg: 'rgba(34, 197, 94, 0.22)', label: 'Green' },
  yellow: { bg: 'rgba(234, 179, 8, 0.28)', label: 'Yellow' },
  orange: { bg: 'rgba(249, 115, 22, 0.24)', label: 'Orange' },
  red: { bg: 'rgba(239, 68, 68, 0.22)', label: 'Red' },
  purple: { bg: 'rgba(168, 85, 247, 0.22)', label: 'Purple' },
  gray: { bg: 'rgba(148, 163, 184, 0.28)', label: 'Gray' },
}

export const DOC_TEXT_COLORS: { key: string; color: string; label: string }[] = [
  { key: 'default', color: '', label: 'Default' },
  { key: 'blue', color: '#3b82f6', label: 'Blue' },
  { key: 'green', color: '#22c55e', label: 'Green' },
  { key: 'yellow', color: '#eab308', label: 'Yellow' },
  { key: 'orange', color: '#f97316', label: 'Orange' },
  { key: 'red', color: '#ef4444', label: 'Red' },
  { key: 'purple', color: '#a855f7', label: 'Purple' },
  { key: 'muted', color: '#94a3b8', label: 'Muted' },
]

export function isDocSurfaceKey(v: string): v is DocSurfaceKey {
  return (DOC_SURFACE_KEYS as readonly string[]).includes(v)
}

export function surfaceBg(key: DocSurfaceKey): string {
  return DOC_SURFACE_PRESETS[key].bg
}
