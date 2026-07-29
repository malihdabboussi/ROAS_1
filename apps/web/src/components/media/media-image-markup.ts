export type ImageMarkupKind = 'pen' | 'pin'

export interface ImageMarkupPoint {
  x: number
  y: number
}

export interface ImageMarkupAnnotation {
  id: string
  kind: ImageMarkupKind
  points: ImageMarkupPoint[]
  feedback: string
}

function percent(value: number): number {
  return Math.round(value * 100)
}

function annotationInstruction(annotation: ImageMarkupAnnotation): string | null {
  const feedback = annotation.feedback.trim()
  const first = annotation.points[0]
  if (!feedback || !first) return null

  if (annotation.kind === 'pin') {
    return `Pin at ${percent(first.x)}% from the left and ${percent(first.y)}% from the top: ${feedback}.`
  }

  const xs = annotation.points.map((point) => point.x)
  const ys = annotation.points.map((point) => point.y)
  return `Freehand mark covering left ${percent(Math.min(...xs))}%–${percent(Math.max(...xs))}% and top ${percent(Math.min(...ys))}%–${percent(Math.max(...ys))}%: ${feedback}.`
}

export function buildImageMarkupPrompt(
  annotations: ImageMarkupAnnotation[],
  additionalDirection = '',
): string {
  const instructions = annotations
    .map(annotationInstruction)
    .filter((instruction): instruction is string => Boolean(instruction))
  if (instructions.length === 0) return ''

  const direction = additionalDirection.trim()
  return [
    'Edit the source image using these location-specific markup notes.',
    ...instructions.map((instruction, index) => `${index + 1}. ${instruction}`),
    direction ? `Additional direction: ${direction}.` : null,
    'Apply only the requested changes. Preserve every unmarked element, the existing composition, typography, colors, and image quality. Keep all text fully visible inside the canvas.',
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')
}
