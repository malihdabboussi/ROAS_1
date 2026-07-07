'use client'

import * as LucideIcons from 'lucide-react'

export function LucideIcon({ name, className }: { name: string; className?: string }) {
  const componentName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  const IconComponent = (
    LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>
  )[componentName]

  if (!IconComponent) {
    return <LucideIcons.HelpCircle className={className} />
  }

  return <IconComponent className={className} />
}

export const ICON_COLORS = [
  { id: 'default', label: 'Default', glassClass: '', textColor: 'text-muted-foreground' },
  {
    id: 'purple',
    label: 'Purple',
    glassClass: 'badge-glass-purple',
    textColor: 'text-[rgb(var(--vibe-purple-light))]',
  },
  { id: 'blue', label: 'Blue', glassClass: 'badge-glass-blue', textColor: 'text-blue-400' },
  { id: 'green', label: 'Green', glassClass: 'badge-glass-green', textColor: 'text-emerald-400' },
  { id: 'cyan', label: 'Cyan', glassClass: 'badge-glass-cyan', textColor: 'text-cyan-400' },
  { id: 'orange', label: 'Orange', glassClass: 'badge-glass-orange', textColor: 'text-orange-400' },
  { id: 'red', label: 'Red', glassClass: 'badge-glass-red', textColor: 'text-red-400' },
  { id: 'yellow', label: 'Yellow', glassClass: 'badge-glass-yellow', textColor: 'text-yellow-400' },
  {
    id: 'muted',
    label: 'Muted',
    glassClass: 'badge-glass-muted',
    textColor: 'text-[var(--color-muted-foreground)]',
  },
] as const

export type IconColorId = (typeof ICON_COLORS)[number]['id']

export function getIconColor(colorId?: string | null) {
  return ICON_COLORS.find((c) => c.id === colorId) ?? ICON_COLORS[0]
}
