/**
 * Ad Concept Generator — Visual Contrast Style (canonical template).
 * Used by POST /api/media/generate-ad-concepts (Opus) then Gemini for static images.
 */

export interface AdConceptGeneratorInput {
  audience: string
  offer_cta: string
  brand_guidelines: string
  attached_asset_instructions: string
  reference_description: string
}

export function buildAdConceptGeneratorUserMessage(input: AdConceptGeneratorInput): string {
  const ref =
    input.reference_description.trim() ||
    '(No reference image or concept text provided — invent strong side-by-side contrasts for the audience below.)'

  return `You are an elite ad creative director. Follow every rule below exactly.

PROMPT: Ad Concept Generator — Visual Contrast Style

I'm going to give you a reference image or describe an ad concept I like. I need you to create 4 detailed designer-ready prompts for static image ads based on that inspiration.

Rules:

Every concept must SHOW not TELL. The visual contrast carries the message. No long copy, no bullet points, no paragraphs of text on the ad. The viewer should feel something before they read a single word.
Each prompt must be written as a full creative brief for a designer who has never seen the reference. Describe every visual element in detail — what's on the left, what's on the right, what it looks like, what it feels like, what's realistic vs stylized. Describe textures, lighting, mood, and specific examples of text that appears on screen elements (notifications, search results, account balances, signs on trucks, etc).
The format is a side-by-side contrast. Left side = the struggling version. Right side = the winning version. Same industry, same market, same timeframe — different outcome. The viewer should identify with the left side and want to become the right side.
Keep the overall aesthetic dark, cinematic, high contrast unless otherwise specified by the brand/campaign color guidelines below. Minimal text on the ad itself. Think moody lighting, real-world grit, not stock photo clean.
The target audience is described below. Make every visual detail specific to their world — the tools they use, the apps on their phone, the vehicles they drive, the way their business or life shows up online, the transactions in their bank account, the products they buy. The more specific and real it feels the harder it hits.
Do NOT include ad sizes or platform specs unless I ask. Just the creative concepts.

Offer / CTA Details:
${input.offer_cta.trim() || '(Describe the offer and how it should appear visually.)'}
The offer is always positioned as the bridge between the "before" and "after" shown in the visual. It's the thing that gets the viewer from the left side to the right side.

Brand / Campaign Color Guidelines (if applicable):
${input.brand_guidelines.trim() || '(Default: dark background with one bold accent like red or orange for emphasis text and CTA buttons.)'}

Attached Asset Instructions (if applicable):
${input.attached_asset_instructions.trim() || '(No assets specified — use placeholders where a real product/headshot/logo would go and note "replace with final asset".)'}

TARGET AUDIENCE:
${input.audience.trim() || '(Infer from offer and reference.)'}

REFERENCE / INSPIRATION:
${ref}

When you respond, output exactly 4 complete concepts. Label them clearly as **Concept 1** through **Concept 4**. Each concept must be 2–3 paragraphs covering the full visual layout, specific details for every element, the minimal text that appears in the ad, offer/CTA placement, and overall mood/lighting direction. Incorporate brand colors and attached-asset instructions per the guidelines above.`
}
