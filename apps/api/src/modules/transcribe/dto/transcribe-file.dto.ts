import { z } from 'zod'

const SUPPORTED_AUDIO_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/m4a',
  'audio/ogg',
] as const

const MAX_FILE_SIZE = 10 * 1024 * 1024

export const TranscribeFileSchema = z.object({
  size: z
    .number()
    .min(1, 'Audio file cannot be empty')
    .max(MAX_FILE_SIZE, 'Audio file too large (max 10MB)'),
  type: z.string().refine((type) => {
    const baseType = type.split(';')[0]
    return SUPPORTED_AUDIO_TYPES.includes(baseType as (typeof SUPPORTED_AUDIO_TYPES)[number])
  }, 'Invalid audio format (supported: webm, wav, mp3, m4a, ogg)'),
})

export type TranscribeFileInput = z.infer<typeof TranscribeFileSchema>

export const TRANSCRIBE_FILE_LIMITS = {
  maxSize: MAX_FILE_SIZE,
  maxSizeLabel: '10MB',
  supportedTypes: SUPPORTED_AUDIO_TYPES,
} as const
