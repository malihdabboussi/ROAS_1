/**
 * Apply brand + copy substitutions to Adley template generated_html / TSX.
 */
import type { ClientPersona } from '../content/_types'
import type { CuratedCopyReplacement, CuratedTemplateSpec } from '../content/curated-templates'

const ADLEY_MEDIA_USER_ID = '92ae97d0-447e-497c-8ecf-bbab8382defc'

const GLOBAL_SCRUB: readonly CuratedCopyReplacement[] = [
  { from: 'Adley Kinsman', to: 'Foundry Creative' },
  { from: 'Adley', to: 'Foundry' },
  { from: 'adley@viralish.com', to: 'team@foundrycreative.io' },
  { from: 'user-92ae97d0.vibeyfunnels.com', to: 'demo.foundrycreative.io' },
  { from: 'goviralish.com', to: 'foundrycreative.io' },
  { from: 'viralish.com', to: 'foundrycreative.io' },
  { from: 'Viralish', to: '{{client_name}}' },
  { from: 'VIRALISH', to: '{{client_name_upper}}' },
  { from: 'V Club tier', to: 'Member tier' },
  { from: 'V Club', to: '{{client_name}} Circle' },
  { from: 'V CLUB', to: '{{client_name_upper}} CIRCLE' },
  { from: 'VClub', to: '{{client_slug}}Circle' },
  { from: 'Shannon', to: 'Sara' },
]

const BRAND_LEAK_PATTERNS: readonly RegExp[] = [
  new RegExp(ADLEY_MEDIA_USER_ID, 'i'),
  /viralish/i,
  /\badley\b/i,
  /\bv[\s-]?club\b/i,
  /\bvclub\b/i,
  /kinsman/i,
  /goviralish/i,
]

function replaceAllLiteral(source: string, from: string, to: string): string {
  if (!from) return source
  return source.split(from).join(to)
}

function replaceAllColors(source: string, fromColor: string, toColor: string): string {
  const variants = new Set<string>([fromColor, fromColor.toLowerCase(), fromColor.toUpperCase()])
  let out = source
  for (const variant of variants) {
    out = replaceAllLiteral(out, variant, toColor)
  }
  return out
}

function clientInitials(client: ClientPersona): string {
  return client.name
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function clientLogoDataUri(client: ClientPersona): string {
  const initials = clientInitials(client)
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80"><rect width="320" height="80" rx="8" fill="${client.brand.primary}"/><text x="160" y="46" text-anchor="middle" fill="${client.brand.accent}" font-family="system-ui,sans-serif" font-size="26" font-weight="700">${initials}</text></svg>`,
  )
}

function clientAvatarDataUri(client: ClientPersona): string {
  const initials = clientInitials(client)
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><circle cx="120" cy="120" r="120" fill="${client.brand.primary}"/><text x="120" y="132" text-anchor="middle" fill="${client.brand.accent}" font-family="system-ui,sans-serif" font-size="72" font-weight="700">${initials}</text></svg>`,
  )
}

function scrubAdleyMediaUrls(source: string, client: ClientPersona): string {
  const logo = clientLogoDataUri(client)
  const avatar = clientAvatarDataUri(client)
  const adleyUrlPattern = /https:\/\/[^"'\s)]+92ae97d0[^"'\s)]*/gi

  return source.replace(adleyUrlPattern, (match, offset) => {
    const window = source.slice(Math.max(0, offset - 120), offset + match.length + 40).toLowerCase()
    if (
      window.includes('headshot') ||
      window.includes('avatar') ||
      window.includes('profile') ||
      window.includes('photo')
    ) {
      return avatar
    }
    return logo
  })
}

function scrubBrandComments(source: string): string {
  return source
    .replace(/\{\/\*[^*]*\bADLEY\b[^*]*\*\/\}/gi, '{/* team */}')
    .replace(/\{\/\*[^*]*\bVIRALISH\b[^*]*\*\/\}/gi, '{/* brand */}')
    .replace(/\{\/\*[^*]*\bV CLUB\b[^*]*\*\/\}/gi, '{/* membership */}')
}

function resolveReplacementToken(to: string, client: ClientPersona): string {
  return to
    .replace(/\{\{client_name\}\}/g, client.name)
    .replace(/\{\{client_name_upper\}\}/g, client.name.toUpperCase())
    .replace(/\{\{client_slug\}\}/g, client.slug)
}

function collectBrandLeaks(source: string): string[] {
  const leaks: string[] = []
  for (const pattern of BRAND_LEAK_PATTERNS) {
    if (pattern.test(source)) leaks.push(pattern.source)
  }
  return leaks
}

export interface ReskinResult {
  html: string
  warnings: string[]
}

export function reskinGeneratedCode(
  source: string,
  client: ClientPersona,
  spec: CuratedTemplateSpec,
): ReskinResult {
  const warnings: string[] = []
  let out = source

  for (const color of spec.sourceColors) {
    out = replaceAllColors(out, color, client.brand.accent)
  }

  if (spec.sourceSecondaryColors) {
    for (const color of spec.sourceSecondaryColors) {
      out = replaceAllColors(out, color, client.brand.primary)
    }
  }

  const replacements = [...spec.copyReplacements, ...GLOBAL_SCRUB].sort(
    (a, b) => b.from.length - a.from.length,
  )

  for (const { from, to } of replacements) {
    const resolvedTo = resolveReplacementToken(to, client)
    if (out.includes(from)) {
      out = replaceAllLiteral(out, from, resolvedTo)
    }
  }

  out = scrubAdleyMediaUrls(out, client)
  out = scrubBrandComments(out)

  // Case-insensitive pass for residual tokens missed by exact replacements.
  out = out.replace(/\bADLEY\b/g, client.name.split(/\s+/)[0]?.toUpperCase() ?? 'FOUNDER')
  out = out.replace(/\bAdley\b/g, client.name.split(/\s+/)[0] ?? 'Founder')
  out = out.replace(/\badley\b/g, (client.name.split(/\s+/)[0] ?? 'founder').toLowerCase())
  out = out.replace(/\bVIRALISH\b/g, client.name.toUpperCase())
  out = out.replace(/\bViralish\b/g, client.name)
  out = out.replace(/\bviralish\b/g, client.name.toLowerCase())
  out = out.replace(/'vclub'/gi, "'member'")
  out = out.replace(/\bvclub\b/gi, 'member')

  const leaks = collectBrandLeaks(out)
  if (leaks.length > 0) {
    warnings.push(`Residual brand tokens after reskin: ${leaks.join(', ')}`)
  }

  return { html: out, warnings }
}

export function reskinPresentationName(
  name: string,
  client: ClientPersona,
  spec: CuratedTemplateSpec,
): string {
  let out = name
  for (const { from, to } of [...spec.copyReplacements, ...GLOBAL_SCRUB]) {
    out = replaceAllLiteral(out, from, resolveReplacementToken(to, client))
  }
  if (!out.trim()) out = spec.demoName
  return `${client.name} — ${spec.demoName}`
}
