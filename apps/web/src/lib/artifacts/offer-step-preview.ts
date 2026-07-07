export const OFFER_STEP_LABELS = [
  'Product & Market',
  'Power Offer',
  'Buyer Persona',
  'ICP Analysis',
  'Competitive Edge',
  'Unique Mechanisms',
] as const

export function offerStepSummary(stepData: Record<string, unknown> | null | undefined): string {
  if (!stepData || typeof stepData !== 'object') return ''
  const out: string[] = []
  const walk = (val: unknown) => {
    if (typeof val === 'string') {
      const s = val.trim()
      if (s && s.length > 8) out.push(s)
    } else if (Array.isArray(val)) {
      for (const v of val) {
        if (out.length >= 2) break
        walk(v)
      }
    } else if (val && typeof val === 'object') {
      for (const v of Object.values(val)) {
        if (out.length >= 2) break
        walk(v)
      }
    }
  }
  walk(stepData)
  const joined = out.join(' · ')
  return joined.length > 120 ? `${joined.slice(0, 120).trimEnd()}…` : joined
}

/** Same step previews as the inline chat Offer card (step1_data … step6_data). */
export function buildOfferStepPreviews(
  offerRow: unknown,
): Array<{ label: string; preview: string }> {
  if (!offerRow || typeof offerRow !== 'object') return []
  const data = offerRow as Record<string, unknown>
  const result: Array<{ label: string; preview: string }> = []
  for (let i = 1; i <= 6; i++) {
    const stepData = data[`step${i}_data`] as Record<string, unknown> | null | undefined
    const preview = offerStepSummary(stepData)
    if (preview)
      result.push({
        label: OFFER_STEP_LABELS[i - 1] ?? `Step ${i}`,
        preview,
      })
  }
  return result
}
