export type ImageModelProvider = 'gemini' | 'openai' | 'flux'

export interface ImageModelDefinition {
  id: string
  label: string
  provider: ImageModelProvider
  description: string
  supportsEdit: boolean
  supportsGenerate: boolean
  defaultAspectRatios: readonly ('1:1' | '9:16' | '4:5' | '16:9')[]
}

export const IMAGE_MODELS: readonly ImageModelDefinition[] = [
  {
    id: 'gemini-3.1-flash-image-preview',
    label: 'Gemini 3.1 Flash',
    provider: 'gemini',
    description: 'Fast iteration, good for drafts and variations.',
    supportsEdit: true,
    supportsGenerate: true,
    defaultAspectRatios: ['1:1', '9:16', '4:5'],
  },
  {
    id: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro',
    provider: 'gemini',
    description: 'Higher fidelity, slower.',
    supportsEdit: true,
    supportsGenerate: true,
    defaultAspectRatios: ['1:1', '9:16', '4:5'],
  },
  {
    id: 'gpt-5.4-image-2',
    label: 'GPT Image 2',
    provider: 'openai',
    description: 'Best for legible on-image text.',
    supportsEdit: true,
    supportsGenerate: true,
    defaultAspectRatios: ['1:1', '9:16'],
  },
  {
    id: 'flux-nano-banana-2',
    label: 'Flux Nano Banana 2',
    provider: 'flux',
    description: 'Premium photoreal, cinematic visual contrast.',
    supportsEdit: false,
    supportsGenerate: true,
    defaultAspectRatios: ['1:1', '4:5', '9:16'],
  },
] as const

export const DEFAULT_IMAGE_MODEL_ID = 'gemini-3.1-flash-image-preview'

export const IMAGE_MODEL_BY_ID: Record<string, ImageModelDefinition> = Object.fromEntries(
  IMAGE_MODELS.map((m) => [m.id, m]),
)

export function getImageModel(id: string): ImageModelDefinition | undefined {
  return IMAGE_MODEL_BY_ID[id]
}

export function isValidImageModel(id: string): boolean {
  return id in IMAGE_MODEL_BY_ID
}

export function assertImageModel(
  id: string,
  opts?: { requireEdit?: boolean },
): ImageModelDefinition {
  const model = getImageModel(id)
  if (!model) throw new Error(`Unknown image model: ${id}`)
  if (opts?.requireEdit && !model.supportsEdit) {
    throw new Error(`Model ${id} does not support image edit`)
  }
  return model
}
