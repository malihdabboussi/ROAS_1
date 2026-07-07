import type { FunnelElementTrace } from '../types'

export function formatFunnelElementContext(trace: FunnelElementTrace): string {
  const style = trace.computed_style
  return [
    '<mentioned-element>',
    `funnel_id: ${trace.funnel_id}`,
    `funnel_page_id: ${trace.funnel_page_id}`,
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
