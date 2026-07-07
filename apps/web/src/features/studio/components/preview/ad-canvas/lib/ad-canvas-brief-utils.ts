import type { AdCanvasBriefPayload } from '../types/ad-canvas.types'

export function briefText(payload: AdCanvasBriefPayload): string {
  return payload.brief?.trim() || payload.text?.trim() || ''
}

export function buildBriefAgentUserBrief(payload: AdCanvasBriefPayload): string {
  const direction = briefText(payload)
  const hints = [
    payload.audience ? `Audience hint: ${payload.audience}` : null,
    payload.offer ? `Offer/CTA hint: ${payload.offer}` : null,
    payload.brand_guidelines ? `Brand hint: ${payload.brand_guidelines}` : null,
    payload.attached_assets ? `Assets hint: ${payload.attached_assets}` : null,
    payload.reference_description ? `Reference hint: ${payload.reference_description}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return [
    'Complete this ad creative brief end-to-end on the canvas.',
    'Research and infer target audience, offer/CTA, brand guidelines, attached assets, and reference direction as needed.',
    'Generate 4 distinct strategy concepts and wire them as strategy child nodes from this brief.',
    '',
    direction
      ? `User direction:\n${direction}`
      : 'User direction: infer from campaign and ad set context.',
    hints ? `\nOptional hints:\n${hints}` : '',
  ].join('\n')
}

export function conceptsTextFromPayload(payload: AdCanvasBriefPayload): string | undefined {
  const text = payload.concepts_text ?? payload.concept_text
  return typeof text === 'string' && text.trim() ? text : undefined
}
