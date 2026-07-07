'use client'

import {
  buildStandalonePresentationHtml,
  downloadHTML,
  downloadPresentationPDFFromIframe,
  downloadPresentationPDFFromSlides,
  downloadPresentationPPTFromIframe,
  downloadPresentationPPTFromSlides,
  fetchPresentationBundle,
} from '@/lib/artifacts'
import type { MissionDeliverable } from '@/lib/missions'

type PresentationExportFormat = 'html' | 'pdf' | 'ppt'

function getPresentationSlides(entityData: unknown): Record<string, unknown>[] {
  if (!entityData || typeof entityData !== 'object') return []
  const slides = (entityData as { slides?: unknown }).slides
  if (!Array.isArray(slides)) return []
  return slides.filter(
    (slide): slide is Record<string, unknown> =>
      !!slide && typeof slide === 'object' && !Array.isArray(slide),
  )
}

function getPresentationGeneratedHtml(entityData: unknown): string | null {
  if (!entityData || typeof entityData !== 'object') return null
  const generatedHtml = (entityData as { generated_html?: unknown }).generated_html
  return typeof generatedHtml === 'string' && generatedHtml.trim() ? generatedHtml : null
}

async function exportPresentationHtml(
  deliverable: MissionDeliverable,
  entityData: unknown,
  title: string,
) {
  if (deliverable.entity_id) {
    const bundle = await fetchPresentationBundle(deliverable.entity_id)
    if (bundle.source_mode === 'html_bundle' && bundle.has_entry) {
      const html = await buildStandalonePresentationHtml(bundle)
      downloadHTML(html, title)
      return
    }
  }

  const generatedHtml = getPresentationGeneratedHtml(entityData)
  if (generatedHtml) {
    downloadHTML(generatedHtml, title)
    return
  }

  throw new Error('No presentation HTML available for export')
}

async function exportPresentationDeck(
  format: Exclude<PresentationExportFormat, 'html'>,
  entityData: unknown,
  title: string,
) {
  const hasLiveIframe = !!document.querySelector('[data-presentation-export-iframe]')
  if (hasLiveIframe) {
    if (format === 'pdf') await downloadPresentationPDFFromIframe(title)
    else await downloadPresentationPPTFromIframe(title)
    return
  }

  const slides = getPresentationSlides(entityData)
  if (slides.length === 0) throw new Error('No slides to export')

  if (format === 'pdf') await downloadPresentationPDFFromSlides(slides, title)
  else await downloadPresentationPPTFromSlides(slides, title)
}

export async function exportPresentationDeliverable({
  format,
  deliverable,
  entityData,
  title,
}: {
  format: PresentationExportFormat
  deliverable: MissionDeliverable
  entityData: unknown
  title: string
}) {
  if (format === 'html') {
    await exportPresentationHtml(deliverable, entityData, title)
    return
  }
  await exportPresentationDeck(format, entityData, title)
}
