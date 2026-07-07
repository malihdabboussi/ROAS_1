import {
  getAllOfferFields,
  OFFER_WORKBOOK_SECTIONS,
} from './offer-sections.config'
import type { Offer } from './artifact-types'
import {
  appendArtifactPdfHeader,
  appendPdfFieldBlock,
  ARTIFACT_PDF_CONTENT_WIDTH_MM,
  buildArtifactPdfStyles,
  isPdfFieldEmpty,
} from './artifact-pdf-shared'

function getStepRecord(offer: Offer, dataKey: string): Record<string, unknown> | null {
  const raw = (offer as unknown as Record<string, unknown>)[dataKey]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as Record<string, unknown>
}

export function buildOfferPdfExportRoot(offer: Offer): {
  root: HTMLElement
  scopeClass: string
  styles: string
} {
  const scopeClass = `offer-pdf-vibey-${Date.now()}`
  const contentWidthMm = ARTIFACT_PDF_CONTENT_WIDTH_MM

  const root = document.createElement('div')
  root.className = scopeClass

  const updated = new Date(offer.updated_at || offer.created_at)
  const dateStr = Number.isNaN(updated.getTime())
    ? ''
    : updated.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  appendArtifactPdfHeader(
    root,
    offer.name?.trim() || 'Offer workbook',
    `Offer export${dateStr ? ` · ${dateStr}` : ''}`,
  )

  const main = document.createElement('main')

  for (const section of OFFER_WORKBOOK_SECTIONS) {
    const stepData = getStepRecord(offer, section.dataKey)
    if (!stepData) continue

    const allFields = getAllOfferFields(stepData, section.fields)
    const hasContent = allFields.some(([key]) => !isPdfFieldEmpty(stepData[key]))
    if (!hasContent) continue

    const sec = document.createElement('section')
    sec.className = 'pdf-section'

    const secTitle = document.createElement('h2')
    secTitle.className = 'pdf-section-title'
    secTitle.textContent = section.title
    sec.appendChild(secTitle)

    for (const [key, label] of allFields) {
      const val = stepData[key]
      appendPdfFieldBlock(sec, label, val)
    }

    main.appendChild(sec)
  }

  root.appendChild(main)

  return { root, scopeClass, styles: buildArtifactPdfStyles(scopeClass, contentWidthMm) }
}
