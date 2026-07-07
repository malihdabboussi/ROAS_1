import type { TypeFilter } from '@/components/media/media-picker-modal.types'

export const PAGE_SIZE = 24

export const LIBRARY_MEDIA_TYPES = new Set(['image', 'video', 'document'])

export const TYPE_PILLS: { id: TypeFilter; label: string }[] = [
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'document', label: 'Documents' },
]

export const MEDIA_PICKER_CLOUD_ATTACH_ITEM_CLASS =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]'
