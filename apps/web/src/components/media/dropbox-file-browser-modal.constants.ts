import type { DropboxTableColKey } from '@/components/media/dropbox-file-browser-modal.types'

export const DROPBOX_SELECT_COL_PX = 32

export const DROPBOX_TABLE_COL_DEFAULTS: Record<DropboxTableColKey, number> = {
  name: 280,
  size: 88,
  modified: 120,
  actions: 176,
}

export const DROPBOX_TABLE_COL_MINS: Record<DropboxTableColKey, number> = {
  name: 120,
  size: 64,
  modified: 88,
  actions: 140,
}

export const DROPBOX_TABLE_ORDER: readonly DropboxTableColKey[] = [
  'name',
  'size',
  'modified',
  'actions',
]

export const DROPBOX_TABLE_RESIZABLE_HEADERS: {
  key: 'name' | 'size' | 'modified'
  label: string
  thClass: string
}[] = [
  { key: 'name', label: 'Name', thClass: 'min-w-0 pl-2' },
  { key: 'size', label: 'Size', thClass: 'whitespace-nowrap' },
  { key: 'modified', label: 'Modified', thClass: 'whitespace-nowrap' },
]
