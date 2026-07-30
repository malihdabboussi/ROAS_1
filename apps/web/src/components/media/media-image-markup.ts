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

const SUPPORTED_IMAGE_RATIOS = ['1:1', '4:5', '3:4', '9:16', '4:3', '3:2', '16:9'] as const

export function closestImageAspectRatio(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  const ratio = width / height
  return SUPPORTED_IMAGE_RATIOS.reduce((closest, candidate) => {
    const [candidateWidth, candidateHeight] = candidate.split(':').map(Number)
    const candidateRatio = candidateWidth! / candidateHeight!
    const [closestWidth, closestHeight] = closest.split(':').map(Number)
    const closestRatio = closestWidth! / closestHeight!
    return Math.abs(Math.log(ratio / candidateRatio)) <
      Math.abs(Math.log(ratio / closestRatio))
      ? candidate
      : closest
  })
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
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return `Freehand mark enclosing the target near ${percent((left + right) / 2)}% from the left and ${percent((top + bottom) / 2)}% from the top (region: left ${percent(left)}%–${percent(right)}%, top ${percent(top)}%–${percent(bottom)}%). Apply this instruction to the content enclosed by that region, not to the markup line itself: ${feedback}.`
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
    'Apply only the requested changes inside the marked region. Treat every pixel outside the marked region as locked. Do not crop, resize, reflow, reposition, restyle, or regenerate any unmarked content. Preserve the exact canvas dimensions, composition, typography, colors, spacing, and image quality. Keep all text fully visible inside the canvas.',
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')
}
