import {
  ENTRY_TYPE_COLORS,
  ENTRY_TYPE_LABELS,
  MEMORY_TYPE_COLORS,
  MEMORY_TYPE_LABELS,
} from '../types'

export function memoryTypeLabel(key: string): string {
  return (
    MEMORY_TYPE_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

export function entryTypeLabel(key: string): string {
  return ENTRY_TYPE_LABELS[key] ?? memoryTypeLabel(key)
}

export function entryTypeColor(key: string): string {
  return ENTRY_TYPE_COLORS[key] ?? MEMORY_TYPE_COLORS[key] ?? '--brain-conn-related-to-rgb'
}
