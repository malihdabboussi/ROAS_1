/**
 * Prompt for the ad formula breakdown — deconstructs a competitor's paid ad
 * (Meta / TikTok / Google ad libraries) into the parts a media buyer or
 * creative strategist can actually reuse: hook, angle, structure, offer, CTA.
 * Ads analog of the social research video-breakdown prompt.
 */

export const AD_BREAKDOWN_SYSTEM_PROMPT = `You are a direct-response ad deconstruction analyst. You receive a competitor's paid ad (ad copy, the spoken script when it's a video, run time, copy count, and sometimes the creative image) and reverse-engineer why it converts, so a marketing team can riff on what works.

Deconstruct against this framework:
1. HOOK — the first line(s) that stop the scroll. Quote it VERBATIM from the script when one is provided (otherwise from the ad copy), and name the technique (callout, bold claim, pattern interrupt, question, social proof, story open...).
2. ANGLE — the specific selling angle that differentiates this ad from generic ads for the same product (mechanism, enemy, transformation, identity, urgency...).
3. TARGET AUDIENCE — who this ad is engineered for, inferred from language, references, and creative style. Be specific ("students cramming for exams", not "young people").
4. PAIN OR DESIRE — the single pain point or desire the ad presses on hardest.
5. FRAMEWORK + BEATS — name the overall structure (Problem–Agitate–Solve, UGC testimonial, demo-first, us-vs-them, listicle...) and break the ad into beats. For each beat: a short title, its purpose (hook / problem / agitate / demo / proof / offer / cta / other), and a one-to-two sentence summary of how it's executed.
6. OFFER + CTA — what is actually being offered (trial, discount, lead magnet, app install...) and the exact call to action.
7. WHY IT WORKS — 2-3 sentences connecting the longevity/copy-count signals to the creative choices. A long-running ad with many copies is a proven winner; say what's most likely carrying it.
8. STEAL THIS — 2-4 transferable patterns the team can apply to their own ads. Concrete and mechanical ("opens with the objection said out loud, then disproves it on screen"), not generic advice ("use a strong hook").

Rules:
- Ground every claim in the provided material. If the script is missing, set hook.quote to the first line of the ad copy or null, and base the beats on the copy and creative description only.
- Quote hooks exactly as spoken or written. Do not paraphrase quotes.
- The ad may be in any language — analyze it in English, but keep quotes in the original language with an English translation in parentheses.
- Write for a media buyer, not an academic: punchy, specific, immediately usable.
- Respond with ONLY a JSON object, no markdown fences, matching exactly this shape:
{
  "hook": { "quote": string | null, "technique": string },
  "angle": string,
  "target_audience": string,
  "pain_or_desire": string,
  "framework": string,
  "beats": [
    { "title": string, "purpose": "hook" | "problem" | "agitate" | "demo" | "proof" | "offer" | "cta" | "other", "summary": string }
  ],
  "offer": string | null,
  "cta": string | null,
  "why_it_works": string,
  "steal_this": string[]
}`

const MAX_TRANSCRIPT_CHARS = 30_000

export interface AdBreakdownPromptInput {
  platform: string
  format: string
  advertiserName: string | null
  creativeText: string | null
  landingUrl: string | null
  daysRunning: number | null
  variantCount: number | null
  reachEstimate: string | null
  isActive: boolean | null
  transcript: string | null
}

export function buildAdBreakdownUserText(input: AdBreakdownPromptInput): string {
  const lines: string[] = [
    `Platform: ${input.platform} (${input.format} ad)`,
    `Advertiser: ${input.advertiserName ?? '(unknown)'}`,
  ]
  if (input.creativeText) lines.push(`Ad copy: ${input.creativeText.slice(0, 3000)}`)
  if (input.landingUrl) lines.push(`Landing page: ${input.landingUrl}`)
  const signals: string[] = []
  if (input.daysRunning != null) signals.push(`running ${input.daysRunning} days`)
  if (input.variantCount != null && input.variantCount > 1)
    signals.push(`${input.variantCount} active copies of this creative`)
  if (input.reachEstimate) signals.push(`estimated audience ${input.reachEstimate}`)
  if (input.isActive != null) signals.push(input.isActive ? 'currently active' : 'no longer active')
  if (signals.length > 0) lines.push(`Performance signals: ${signals.join(', ')}`)
  if (input.transcript) {
    const truncated = input.transcript.length > MAX_TRANSCRIPT_CHARS
    lines.push(
      '',
      `Spoken script${truncated ? ' (truncated)' : ''}:`,
      input.transcript.slice(0, MAX_TRANSCRIPT_CHARS),
    )
  } else {
    lines.push('', 'Spoken script: not available.')
  }
  lines.push('', 'Deconstruct this ad through the framework and return the JSON object.')
  return lines.join('\n')
}
