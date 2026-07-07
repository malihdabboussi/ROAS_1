import type { PresentationElementTrace } from '../types'

const TEXT_SNAPSHOT_LIMIT = 280

function trimTextSnapshot(value: string | null | undefined): string | null {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  return normalized.length > TEXT_SNAPSHOT_LIMIT
    ? `${normalized.slice(0, TEXT_SNAPSHOT_LIMIT)}...`
    : normalized
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function normalizeStyleValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function normalizeComputedStyle(value: unknown): PresentationElementTrace['computed_style'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const style = value as Record<string, unknown>
  return {
    font_family: normalizeStyleValue(style.font_family),
    font_size: normalizeStyleValue(style.font_size),
    font_weight: normalizeStyleValue(style.font_weight),
    line_height: normalizeStyleValue(style.line_height),
    letter_spacing: normalizeStyleValue(style.letter_spacing),
    color: normalizeStyleValue(style.color),
    color_mixed: style.color_mixed === true,
    background_color: normalizeStyleValue(style.background_color),
    background_color_mixed: style.background_color_mixed === true,
    padding: normalizeStyleValue(style.padding),
    margin: normalizeStyleValue(style.margin),
    border_radius: normalizeStyleValue(style.border_radius),
    width: normalizeStyleValue(style.width),
    height: normalizeStyleValue(style.height),
  }
}

export function normalizePresentationElementTrace(
  input: Record<string, unknown>,
): PresentationElementTrace | null {
  const presentationId = typeof input.presentation_id === 'string' ? input.presentation_id : ''
  const domPath = typeof input.dom_path === 'string' ? input.dom_path : ''
  if (!presentationId || !domPath) return null

  const boundsInput =
    input.bounds && typeof input.bounds === 'object' && !Array.isArray(input.bounds)
      ? (input.bounds as Record<string, unknown>)
      : null
  const x = normalizeNumber(boundsInput?.x)
  const y = normalizeNumber(boundsInput?.y)
  const width = normalizeNumber(boundsInput?.width)
  const height = normalizeNumber(boundsInput?.height)

  return {
    presentation_id: presentationId,
    anchor_id: typeof input.anchor_id === 'string' && input.anchor_id ? input.anchor_id : null,
    dom_path: domPath,
    tag_chain: normalizeStringArray(input.tag_chain),
    text_snapshot: trimTextSnapshot(
      typeof input.text_snapshot === 'string' ? input.text_snapshot : null,
    ),
    bounds:
      x !== null && y !== null && width !== null && height !== null
        ? { x, y, width, height }
        : null,
    slide_index:
      typeof input.slide_index === 'number' && Number.isInteger(input.slide_index)
        ? input.slide_index
        : null,
    source_file:
      typeof input.source_file === 'string' && input.source_file ? input.source_file : null,
    source_hint:
      typeof input.source_hint === 'string' && input.source_hint ? input.source_hint : null,
    computed_style: normalizeComputedStyle(input.computed_style),
  }
}

export function formatPresentationElementContext(trace: PresentationElementTrace): string {
  const style = trace.computed_style
  return [
    '<mentioned-element>',
    `presentation_id: ${trace.presentation_id}`,
    `slide_index: ${trace.slide_index ?? 'unknown'}`,
    `anchor_id: ${trace.anchor_id ?? 'none'}`,
    `source_file: ${trace.source_file ?? 'unknown'}`,
    `source_hint: ${trace.source_hint ?? 'none'}`,
    `dom_path: ${trace.dom_path}`,
    `tag_chain: ${trace.tag_chain.join(' > ') || 'unknown'}`,
    `text_snapshot: ${trace.text_snapshot ?? 'none'}`,
    style
      ? `computed_style: font=${style.font_family ?? 'unknown'}, size=${style.font_size ?? 'unknown'}, weight=${style.font_weight ?? 'unknown'}, color=${style.color ?? 'unknown'}, background=${style.background_color ?? 'unknown'}, padding=${style.padding ?? 'unknown'}, margin=${style.margin ?? 'unknown'}`
      : 'computed_style: unknown',
    trace.bounds
      ? `bounds: x=${Math.round(trace.bounds.x)}, y=${Math.round(trace.bounds.y)}, width=${Math.round(trace.bounds.width)}, height=${Math.round(trace.bounds.height)}`
      : 'bounds: unknown',
    '</mentioned-element>',
  ].join('\n')
}
