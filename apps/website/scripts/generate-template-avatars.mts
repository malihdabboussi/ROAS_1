#!/usr/bin/env npx tsx
/**
 * Generate real portraits for agent_employee_templates using Gemini 3.1 Flash image preview,
 * upload to Supabase Storage, and UPDATE the DB rows.
 *
 * Usage:  GEMINI_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx apps/website/scripts/generate-template-avatars.mts
 * Or:     source apps/api/.env && npx tsx apps/website/scripts/generate-template-avatars.mts
 */

import { createClient } from '@supabase/supabase-js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const MODEL = 'gemini-3.1-flash-image-preview'
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const BUCKET = 'media'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

const PORTRAIT_PROMPTS = [
  (n: string, r: string) =>
    `Candid portrait of ${n}, a ${r} in their early 30s. Visible laugh lines around mouth, light freckles across nose bridge, natural skin texture with subtle pores. Warm hazel eyes with amber flecks, relaxed direct gaze, natural lashes. Wearing a sun-faded olive cotton henley, top button undone, fabric softened from years of wear. Thin braided leather bracelet on one wrist. Sitting near a tall window, warm afternoon light casting soft diagonal shadows across face. 85mm lens, f/2.0, shallow depth of field, high texture fidelity. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
  (n: string, r: string) =>
    `Editorial portrait of ${n}, a ${r} aged 28-33. Fine expression lines at corners of eyes, natural uneven skin tone, visible pore texture on cheeks. Dark brown eyes catching a soft neon reflection, steady half-smile gaze slightly off-camera. Wearing a broken-in cognac leather jacket over a plain charcoal tee, collar popped casually. Small silver hoop in one ear. Soft pink-purple neon accent light from the left, dark moody background with bokeh city lights. 50mm lens, f/1.8, high texture fidelity, no beauty smoothing. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, bloom.`,
  (n: string, r: string) =>
    `Lifestyle portrait of ${n}, a young ${r}. Visible dimples, natural skin redness around nose, subtle under-eye circles from real life. Clear grey-green eyes with fine dark lashes, open genuine expression looking into camera. Wearing an unstructured raw-hem linen overshirt in dusty sage, sleeves pushed up to elbows, white tee underneath. Worn canvas watch strap on wrist. Leaning against a weathered concrete wall, overcast daylight creating even soft illumination with cool blue-grey tones. 85mm lens, f/2.2, shallow depth of field, Kodak Portra 400 film tones. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated colors.`,
  (n: string, r: string) =>
    `Close-up portrait of ${n}, a ${r} in their late 20s. Pronounced cheekbone shadows, natural hyperpigmentation on forehead, visible pores and faint texture along jawline. Deep brown eyes with warm amber ring around pupil, direct intense gaze with half-smile. Wearing a well-worn black ribbed crew-neck, fabric stretched slightly at collar. No visible jewelry. Dramatic single-source side lighting from the right, deep shadows on opposite cheek, dark charcoal background. Medium format camera feel, 90mm equivalent, f/2.4, extremely high texture fidelity. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR, bloom.`,
  (n: string, r: string) =>
    `Outdoor portrait of ${n}, a ${r} aged 30-35. Sun-warmed skin with fine crow's feet starting at eye corners, a scattering of moles on neck, natural unretouched complexion. Bright amber-brown eyes squinting slightly against the light, easy relaxed grin showing teeth. Wearing a faded indigo denim trucker jacket, top snap undone, heather-grey tee visible beneath. Thin gold chain catching sunlight at collarbone. Standing on a quiet residential street, late golden-hour sun creating warm rim light on hair and shoulders, soft urban bokeh behind. 35mm lens, f/2.8, street photography aesthetic, natural grain. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
  (n: string, r: string) =>
    `Café portrait of ${n}, a ${r} in their early 30s. Fine smile lines around eyes, a faded scar near left eyebrow, natural skin with visible pore texture and slight flush across cheeks. Olive-green eyes with golden undertones, warm genuine eye-contact smile with crow's feet deepening. Wearing an oatmeal-colored chunky wool cardigan over a fitted dark navy tee, fabric texture visible in knit pattern. Delicate silver pendant on a thin chain. Seated near a window, cool natural daylight from the left mixing with warm interior amber, soft shadows on right side of face. 85mm lens, f/1.8, shallow depth of field, film-like color rendering. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated colors.`,
  (n: string, r: string) =>
    `Rooftop portrait of ${n}, a ${r} around 32. Wind-tousled hair, natural sun weathering on cheekbones, visible pores and subtle peach fuzz catching backlight. Light brown eyes with green flecks, warm expression with a closed-lip smile. Wearing an unlined cotton-twill bomber jacket in washed navy, zippered halfway, over a cream waffle-knit thermal. Simple beaded bracelet on one wrist. City skyline blurred behind, setting sun creating strong warm rim light on hair and shoulders, lens flare kissing the frame edge. 50mm lens, f/2.0, natural backlit exposure, slight haze. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR, bloom.`,
  (n: string, r: string) =>
    `Documentary street portrait of ${n}, a ${r} in their early 30s. Natural complexion with slight redness at nose tip, fine lines forming at eye corners, a small beauty mark on right cheek. Dark eyes with warm depth, relaxed asymmetric smile captured mid-conversation. Wearing a washed olive field jacket with brass snaps, layered over a burgundy pocket tee, collar slightly askew. Thin-framed metal glasses pushed up into hair. Standing in open shade of a building awning, even diffused daylight with cool undertones, blurred pedestrians in background. 40mm lens, f/2.8, documentary candid feel, slight grain. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR.`,
]

const TARGET_ROLE_KEYS = [
  'copywriter',
  'designer',
  'analyst',
  'developer',
  'pm_marketing',
  'pm_product',
  'pm_operations',
  'automation_integrations_engineer',
  'vibey',
]

async function generateImage(prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`
  const body = {
    contents: [{ parts: [{ text: `${prompt}\n\nAspect ratio: 1:1` }] }],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const raw = await res.text()
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${raw.slice(0, 300)}`)

  const data = JSON.parse(raw) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> }
    }>
  }

  const parts = data.candidates?.[0]?.content?.parts
  const imagePart = parts?.find((p) => p.inlineData?.data)
  if (!imagePart?.inlineData?.data) throw new Error('No image data in Gemini response')

  return {
    buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  }
}

async function uploadAndGetUrl(
  buffer: Buffer,
  mimeType: string,
  roleKey: string,
): Promise<string> {
  const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
  const filename = `template-${roleKey}-${Date.now()}.${ext}`
  const filePath = `${SYSTEM_USER_ID}/images/${filename}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: mimeType, upsert: true })
  if (upErr) throw new Error(`Upload failed for ${roleKey}: ${upErr.message}`)

  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 10 * 365 * 24 * 60 * 60)

  const signedUrl = urlData?.signedUrl
  if (!signedUrl) throw new Error(`Signed URL failed for ${roleKey}`)
  return signedUrl
}

async function main() {
  const { data: templates, error } = await supabase
    .from('agent_employee_templates')
    .select('role_key, default_name, role')
    .in('role_key', TARGET_ROLE_KEYS)
    .order('sort_order', { ascending: true })

  if (error || !templates) {
    console.error('Failed to load templates:', error?.message)
    process.exit(1)
  }

  console.log(`Found ${templates.length} templates to process\n`)

  const results: Array<{ role_key: string; image_url: string }> = []

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i]!
    const promptFn = PORTRAIT_PROMPTS[i % PORTRAIT_PROMPTS.length]!
    const prompt = promptFn(t.default_name, t.role)

    console.log(`[${i + 1}/${templates.length}] Generating portrait for ${t.default_name} (${t.role_key})...`)

    try {
      const { buffer, mimeType } = await generateImage(prompt)
      console.log(`  Generated: ${buffer.length} bytes (${mimeType})`)

      const url = await uploadAndGetUrl(buffer, mimeType, t.role_key)
      console.log(`  Uploaded: ${url.slice(0, 80)}...`)

      const { error: dbErr } = await supabase
        .from('agent_employee_templates')
        .update({ image_url: url })
        .eq('role_key', t.role_key)

      if (dbErr) {
        console.error(`  DB update failed: ${dbErr.message}`)
      } else {
        console.log(`  DB updated ✓`)
        results.push({ role_key: t.role_key, image_url: url })
      }
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : err}`)
    }

    if (i < templates.length - 1) {
      console.log('  Waiting 3s (rate limit)...')
      await new Promise((r) => setTimeout(r, 3000))
    }
  }

  console.log(`\n=== RESULTS (${results.length}/${templates.length}) ===\n`)
  for (const r of results) {
    console.log(`  ${r.role_key}: ${r.image_url}`)
  }

  console.log('\n=== FALLBACK UPDATE SNIPPET ===\n')
  for (const r of results) {
    console.log(`    image_url: '${r.image_url}',`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
