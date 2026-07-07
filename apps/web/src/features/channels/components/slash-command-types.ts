import type { ComponentType } from 'react'

export type SlashItemSection = 'actions' | 'skills'

export interface SlashItem {
  id: string
  label: string
  section: SlashItemSection
  keywords: string[]
  icon: ComponentType<{ className?: string }>
  run: () => void
  insertText?: string
  description?: string
}
