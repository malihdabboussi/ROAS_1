export const BRAIN_UPLOAD_LIMITS = {
  MAX_AUDIO_DURATION_SECONDS: 80,
  MAX_VIDEO_DURATION_SECONDS: 120,
} as const

export type BrainUploadKind =
  | 'text'
  | 'document'
  | 'pdf'
  | 'image'
  | 'audio'
  | 'video'
  | 'unsupported'

export type BrainUploadMediaType = 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'

type BrainDurationValidationError =
  | 'AUDIO_DURATION_UNREADABLE'
  | 'VIDEO_DURATION_UNREADABLE'
  | 'AUDIO_DURATION_EXCEEDED'
  | 'VIDEO_DURATION_EXCEEDED'

const TEXT_EXTENSIONS = [
  '.txt',
  '.text',
  '.md',
  '.markdown',
  '.skill',
  '.csv',
  '.tsv',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.log',
]
const DOC_EXTENSIONS = ['.pdf', '.docx', '.doc', '.pptx', '.xls', '.xlsx', '.xlsm']
const SPREADSHEET_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
  '.heic',
  '.heif',
]
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg']
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm']
const SUPPORTED_NATIVE_AUDIO_EXTENSIONS = ['.mp3', '.wav']
const SUPPORTED_NATIVE_VIDEO_EXTENSIONS = ['.mp4', '.mov']
const SUPPORTED_NATIVE_AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav']
const SUPPORTED_NATIVE_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime']

function getLowerFileName(file: File): string {
  return file.name.toLowerCase()
}

function hasExtension(file: File, extensions: string[]): boolean {
  const fileName = getLowerFileName(file)
  return extensions.some((extension) => fileName.endsWith(extension))
}

export function detectBrainUploadKind(file: File): BrainUploadKind {
  const textTypes = [
    'text/',
    'application/json',
    'application/xml',
    'text/xml',
    'application/x-yaml',
    'text/yaml',
  ]

  const isText =
    textTypes.some((type) => file.type.startsWith(type)) || hasExtension(file, TEXT_EXTENSIONS)
  if (isText) return 'text'

  const isPdfByMime = file.type === 'application/pdf'
  const isPptxByMime =
    file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  const isSpreadsheetByMime = SPREADSHEET_MIME_TYPES.includes(file.type.toLowerCase())
  const isDocByMime =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
  const isDoc =
    isPdfByMime ||
    isPptxByMime ||
    isSpreadsheetByMime ||
    isDocByMime ||
    hasExtension(file, DOC_EXTENSIONS)
  if (isDoc) return isPdfByMime || hasExtension(file, ['.pdf']) ? 'pdf' : 'document'

  const isImage = file.type.startsWith('image/') || hasExtension(file, IMAGE_EXTENSIONS)
  if (isImage) return 'image'

  const isAudio = file.type.startsWith('audio/') || hasExtension(file, AUDIO_EXTENSIONS)
  if (isAudio) return 'audio'

  const isVideo = file.type.startsWith('video/') || hasExtension(file, VIDEO_EXTENSIONS)
  if (isVideo) return 'video'

  return 'unsupported'
}

export function isExtractableBrainUploadKind(kind: BrainUploadKind): boolean {
  return kind === 'pdf' || kind === 'document' || kind === 'image'
}

export function getBrainUploadMediaType(kind: BrainUploadKind): BrainUploadMediaType {
  switch (kind) {
    case 'image':
      return 'image'
    case 'audio':
      return 'audio'
    case 'video':
      return 'video'
    case 'pdf':
      return 'pdf'
    case 'text':
    case 'document':
    case 'unsupported':
      return 'text'
  }
}

export function getBrainUploadLabel(kind: BrainUploadKind): string {
  switch (kind) {
    case 'image':
      return 'Image'
    case 'audio':
      return 'Audio'
    case 'video':
      return 'Video'
    case 'pdf':
      return 'PDF'
    case 'document':
      return 'Document'
    case 'text':
    case 'unsupported':
      return 'File'
  }
}

export function isSupportedNativeAudioFormat(file: File): boolean {
  return (
    SUPPORTED_NATIVE_AUDIO_MIME_TYPES.includes(file.type) ||
    hasExtension(file, SUPPORTED_NATIVE_AUDIO_EXTENSIONS)
  )
}

export function isSupportedNativeVideoFormat(file: File): boolean {
  return (
    SUPPORTED_NATIVE_VIDEO_MIME_TYPES.includes(file.type) ||
    hasExtension(file, SUPPORTED_NATIVE_VIDEO_EXTENSIONS)
  )
}

async function getMediaDurationSeconds(file: File, mediaKind: 'audio' | 'video'): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const media = document.createElement(mediaKind)
    media.preload = 'metadata'
    media.src = objectUrl

    const cleanup = () => {
      media.removeAttribute('src')
      media.load()
      URL.revokeObjectURL(objectUrl)
    }

    media.onloadedmetadata = () => {
      const duration = Number(media.duration)
      cleanup()
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Invalid media duration'))
        return
      }
      resolve(duration)
    }

    media.onerror = () => {
      cleanup()
      reject(new Error('Failed to read media duration'))
    }
  })
}

export async function validateNativeMediaDuration(
  file: File,
  mediaKind: 'audio' | 'video',
): Promise<{ ok: true } | { ok: false; error: BrainDurationValidationError }> {
  try {
    const durationSeconds = await getMediaDurationSeconds(file, mediaKind)
    if (mediaKind === 'audio' && durationSeconds > BRAIN_UPLOAD_LIMITS.MAX_AUDIO_DURATION_SECONDS) {
      return { ok: false, error: 'AUDIO_DURATION_EXCEEDED' }
    }
    if (mediaKind === 'video' && durationSeconds > BRAIN_UPLOAD_LIMITS.MAX_VIDEO_DURATION_SECONDS) {
      return { ok: false, error: 'VIDEO_DURATION_EXCEEDED' }
    }
    return { ok: true }
  } catch {
    if (mediaKind === 'audio') {
      return { ok: false, error: 'AUDIO_DURATION_UNREADABLE' }
    }
    return { ok: false, error: 'VIDEO_DURATION_UNREADABLE' }
  }
}
