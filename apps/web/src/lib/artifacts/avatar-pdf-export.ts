import { AVATAR_DEEP_DIVE_FIELDS } from './avatar-deep-dive-fields.config'
import type { Avatar } from './artifact-types'
import {
  appendArtifactPdfHeader,
  appendPdfFieldBlock,
  ARTIFACT_PDF_CONTENT_WIDTH_MM,
  buildArtifactPdfStyles,
  formatSnakeCaseLabel,
  isPdfFieldEmpty,
} from './artifact-pdf-shared'
import {
  appendAvatarPdfHero,
  buildAvatarPdfHeroStyles,
} from './avatar-pdf-hero'

const RESERVED_KEYS = new Set([
  'demographics',
  'background_profile',
  'comprehensive_summary',
  'avatar_image',
  ...AVATAR_DEEP_DIVE_FIELDS.map(([k]) => k),
])

export function buildAvatarPdfExportRoot(avatar: Avatar): {
  root: HTMLElement
  scopeClass: string
  styles: string
} {
  const scopeClass = `avatar-pdf-vibey-${Date.now()}`
  const contentWidthMm = ARTIFACT_PDF_CONTENT_WIDTH_MM
  const pd = (avatar.persona_data ?? {}) as Record<string, unknown>

  const root = document.createElement('div')
  root.className = scopeClass

  const updated = new Date(avatar.updated_at || avatar.created_at)
  const dateStr = Number.isNaN(updated.getTime())
    ? ''
    : updated.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  appendArtifactPdfHeader(
    root,
    avatar.name?.trim() || 'Buyer persona',
    `Avatar export${dateStr ? ` · ${dateStr}` : ''}`,
  )

  const main = document.createElement('main')

  const section = document.createElement('section')
  section.className = 'pdf-section'
  const secTitle = document.createElement('h2')
  secTitle.className = 'pdf-section-title'
  secTitle.textContent = 'Buyer Persona'
  section.appendChild(secTitle)

  appendAvatarPdfHero(section, pd)

  if (!isPdfFieldEmpty(pd.background_profile)) {
    appendPdfFieldBlock(section, 'Background Profile', pd.background_profile)
  }
  if (!isPdfFieldEmpty(pd.comprehensive_summary)) {
    appendPdfFieldBlock(section, 'Comprehensive Summary', pd.comprehensive_summary)
  }

  for (const [key, label] of AVATAR_DEEP_DIVE_FIELDS) {
    appendPdfFieldBlock(section, label, pd[key])
  }

  for (const [key, value] of Object.entries(pd)) {
    if (RESERVED_KEYS.has(key)) continue
    appendPdfFieldBlock(section, formatSnakeCaseLabel(key), value)
  }

  main.appendChild(section)
  root.appendChild(main)

  const styles =
    buildArtifactPdfStyles(scopeClass, contentWidthMm) + '\n' + buildAvatarPdfHeroStyles(scopeClass)
  return { root, scopeClass, styles }
}
