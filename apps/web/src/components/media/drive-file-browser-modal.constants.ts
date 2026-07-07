import type { DriveTableColKey } from '@/components/media/drive-file-browser-modal.types'

export const FOLDER_MIME = 'application/vnd.google-apps.folder'

export const DRIVE_SELECT_COL_PX = 40

export const DRIVE_TABLE_COL_DEFAULTS: Record<DriveTableColKey, number> = {
  name: 268,
  size: 96,
  owner: 152,
  modified: 128,
  actions: 208,
}

export const DRIVE_TABLE_COL_MINS: Record<DriveTableColKey, number> = {
  name: 120,
  size: 72,
  owner: 88,
  modified: 88,
  actions: 152,
}

export const DRIVE_TABLE_ORDER: readonly DriveTableColKey[] = [
  'name',
  'size',
  'owner',
  'modified',
  'actions',
]

export const DRIVE_TABLE_RESIZABLE_HEADERS: {
  key: 'name' | 'size' | 'owner' | 'modified'
  label: string
  thClass: string
}[] = [
  { key: 'name', label: 'Name', thClass: 'min-w-0 pl-2' },
  { key: 'size', label: 'Size', thClass: 'whitespace-nowrap' },
  { key: 'owner', label: 'Owner', thClass: 'min-w-0' },
  { key: 'modified', label: 'Modified', thClass: 'whitespace-nowrap' },
]

export const MEDIA_LIBRARY_DOC_MIMES = new Set([
  'application/pdf',
  'application/json',
  'application/msword',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.ms-excel',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/xml',
  'application/x-yaml',
  'application/yaml',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  'text/xml',
  'text/x-yaml',
  'text/yaml',
])

export const MEDIA_LIBRARY_DOC_EXTENSIONS = new Set([
  'pdf',
  'ppt',
  'pptx',
  'doc',
  'docx',
  'txt',
  'md',
  'skill',
  'csv',
  'tsv',
  'json',
  'xml',
  'yaml',
  'yml',
  'xls',
  'xlsx',
  'xlsm',
])

export const MEDIA_LIBRARY_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
])

export const MEDIA_LIBRARY_VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm'])

export const MEDIA_LIBRARY_FILE_INPUT_ACCEPT =
  'image/*,video/*,.pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.skill,.csv,.tsv,.json,.xml,.yaml,.yml,.xls,.xlsx,.xlsm'

function getFileExtension(name: string): string | null {
  const ext = name.toLowerCase().split('.').pop()
  return ext && ext !== name.toLowerCase() ? ext : null
}

export function isMediaLibrarySupportedFileName(name: string) {
  const ext = getFileExtension(name)
  return Boolean(
    ext &&
    (MEDIA_LIBRARY_IMAGE_EXTENSIONS.has(ext) ||
      MEDIA_LIBRARY_VIDEO_EXTENSIONS.has(ext) ||
      MEDIA_LIBRARY_DOC_EXTENSIONS.has(ext)),
  )
}

export function isMediaLibrarySupportedUploadFile(file: { name: string; type: string }) {
  const mimeType = file.type.toLowerCase()
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    MEDIA_LIBRARY_DOC_MIMES.has(mimeType) ||
    isMediaLibrarySupportedFileName(file.name)
  )
}
