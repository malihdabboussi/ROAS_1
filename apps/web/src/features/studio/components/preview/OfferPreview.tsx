'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, Braces, Download, FileCode, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  formatOfferFieldKey,
  getAllOfferFields,
  OFFER_WORKBOOK_SECTIONS,
} from '@/features/studio/config/offer-sections.config'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { fetchOffer } from '../../services/artifact-preview.service'
import type { Offer } from '../../types'
import {
  downloadJSON,
  downloadMarkdown,
  offerToText,
  sanitizeFilename,
} from '../../utils/artifact-export'
import { stampMadeWithVibeyFooterOnAllPages } from '../../utils/artifact-pdf-jspdf-footer'
import { ARTIFACT_HTML2PDF_PAGEBREAK } from '../../utils/artifact-pdf-shared'
import { isLongListItemText } from '../../utils/long-list-item'
import { normalizeEmDashToHyphen } from '../../utils/normalize-em-dash'
import { buildOfferPdfExportRoot } from '../../utils/offer-pdf-export'

interface OfferPreviewProps {
  offerId: string
  hideToolbar?: boolean
  toolbarTrailing?: ReactNode
}

function FieldSectionLabel({ children }: { children: ReactNode }) {
  return <p className="body-3 mb-spacing-1 text-[var(--color-muted-foreground)]">{children}</p>
}

function LabeledBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-spacing-2">
      <FieldSectionLabel>{label}</FieldSectionLabel>
      <div className="text-[var(--color-foreground)]">{children}</div>
    </div>
  )
}

function isSimpleValue(v: unknown): boolean {
  return typeof v === 'string' || typeof v === 'number'
}

/** Render a field value — arrays as bullet lists, objects as key-value blocks, strings as paragraphs */
function renderFieldValue(value: unknown): ReactNode {
  if (Array.isArray(value)) {
    const unique = [
      ...new Set(
        value
          .map((item) =>
            normalizeEmDashToHyphen(
              String(item)
                .replace(/^[\s•\-–—*]+/, '')
                .trim(),
            ),
          )
          .filter(Boolean),
      ),
    ]
    return (
      <ul className="body-2 list-card-compact text-[var(--color-foreground)]">
        {unique.map((item, i) => (
          <li key={i} {...(isLongListItemText(item) ? { 'data-long-item': 'true' as const } : {})}>
            {item}
          </li>
        ))}
      </ul>
    )
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    return (
      <div className="space-y-spacing-4">
        {Object.entries(obj).map(([k, v]) => {
          if (v == null || v === '' || (typeof v === 'string' && v.trim() === '')) return null
          if (isSimpleValue(v)) {
            return (
              <div key={k}>
                <FieldSectionLabel>{formatOfferFieldKey(k)}</FieldSectionLabel>
                <p className="body-2 text-[var(--color-foreground)]">
                  {normalizeEmDashToHyphen(String(v))}
                </p>
              </div>
            )
          }
          return (
            <LabeledBlock key={k} label={formatOfferFieldKey(k)}>
              {renderFieldValue(v)}
            </LabeledBlock>
          )
        })}
      </div>
    )
  }
  return (
    <p className="body-2 whitespace-pre-wrap text-[var(--color-foreground)]">
      {normalizeEmDashToHyphen(String(value))}
    </p>
  )
}

/** Render a single field as its own card */
function FieldCard({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string' && value.trim() === '') return null

  return (
    <div className="card-glass rounded-spacing-3">
      <div className="p-spacing-4 sm:p-spacing-5 md:p-spacing-6">
        <LabeledBlock label={label}>{renderFieldValue(value)}</LabeledBlock>
      </div>
    </div>
  )
}

/** Render a step section — title header + each field as its own card */
function StepSection({
  title,
  stepData,
  fields,
}: {
  title: string
  stepData: Record<string, unknown>
  fields: [string, string][]
}) {
  const allFields = getAllOfferFields(stepData, fields)
  const hasContent = allFields.some(([key]) => {
    const val = stepData[key]
    return val !== null && val !== undefined && val !== ''
  })
  if (!hasContent) return null

  return (
    <div className="space-y-spacing-3">
      <h2 className="title-h3">{title}</h2>
      {allFields.map(([key, label]) => (
        <FieldCard key={key} label={label} value={stepData[key]} />
      ))}
    </div>
  )
}

export function OfferPreview({ offerId, hideToolbar, toolbarTrailing }: OfferPreviewProps) {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadOffer = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOffer(await fetchOffer(offerId))
    } catch (err) {
      setError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_OFFER)
    } finally {
      setLoading(false)
    }
  }, [offerId])

  useEffect(() => {
    void loadOffer()
  }, [loadOffer])

  const handleDownload = useCallback(
    (format: 'json' | 'md') => {
      if (!offer) return
      try {
        const title = offer.name?.trim() || 'offer'
        const filename =
          format === 'json'
            ? downloadJSON(offer, title, 'offer')
            : downloadMarkdown(offerToText(offer), title, 'offer')
        console.log(`Downloaded ${filename}`)
        setDownloadMenuOpen(false)
      } catch (err) {
        console.error('Download failed:', err)
        toast.error(STUDIO_INLINE_ERRORS.DOWNLOAD_FAILED)
      }
    },
    [offer],
  )

  const handleDownloadPDF = useCallback(async () => {
    if (!offer) return
    setExporting(true)
    let cleanup: (() => void) | null = null
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const basename = sanitizeFilename(offer.name ?? '', 'offer')

      const PDF_MARGIN_MM: [number, number, number, number] = [12, 12, 18, 12]
      const PDF_CONTENT_WIDTH_MM = 210 - PDF_MARGIN_MM[1] - PDF_MARGIN_MM[3]

      const host = document.createElement('div')
      host.style.position = 'fixed'
      host.style.left = '-100000px'
      host.style.top = '0'
      host.style.width = `${PDF_CONTENT_WIDTH_MM}mm`
      host.style.opacity = '0'
      host.style.pointerEvents = 'none'
      host.setAttribute('aria-hidden', 'true')

      const { root: scopeNode, styles } = buildOfferPdfExportRoot(offer)

      const styleTag = document.createElement('style')
      styleTag.textContent = styles

      host.appendChild(styleTag)
      host.appendChild(scopeNode)
      document.body.appendChild(host)
      cleanup = () => {
        if (host.parentNode) host.parentNode.removeChild(host)
      }

      await new Promise((resolve) => setTimeout(resolve, 250))

      const opt = {
        margin: PDF_MARGIN_MM,
        filename: `${basename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        enableLinks: true,
        html2canvas: {
          scale: Math.max(2, Math.floor(window.devicePixelRatio || 1)),
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: {
          mode: [...ARTIFACT_HTML2PDF_PAGEBREAK.mode],
          avoid: [...ARTIFACT_HTML2PDF_PAGEBREAK.avoid],
        },
      }
      const worker = (html2pdf() as any).set(opt)['from'](scopeNode)
      await worker.toPdf()
      const pdf = await worker.get('pdf')
      stampMadeWithVibeyFooterOnAllPages(pdf)
      await worker.save()
      setDownloadMenuOpen(false)
    } catch (err) {
      console.error('PDF download failed:', err)
      toast.error(STUDIO_INLINE_ERRORS.DOWNLOAD_FAILED)
    } finally {
      if (cleanup) cleanup()
      setExporting(false)
    }
  }, [offer])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertCircle className="h-8 w-8 text-[var(--color-muted-foreground)]" />
        <p className="body-2 text-[var(--color-foreground)]">
          {error ? 'Unable to load offer' : 'Offer not found'}
        </p>
        {error && <p className="body-3 text-[var(--color-muted-foreground)]">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {!hideToolbar && (
        <div className="border-border flex items-center justify-between border-b px-3 py-2">
          <span className="body-3 text-foreground truncate font-medium">
            {normalizeEmDashToHyphen(offer.name || 'Offer')}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                data-tooltip="Download"
                data-side="bottom"
                className="tooltip btn-icon-bare"
              >
                <Download className="icon-sm" />
              </button>
              {downloadMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setDownloadMenuOpen(false)}
                  />
                  <div className="dropdown-glass absolute right-0 top-full z-[70] mt-1 min-w-[160px] py-1">
                    <button
                      type="button"
                      onClick={() => void handleDownloadPDF()}
                      disabled={exporting}
                      className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                    >
                      {exporting ? (
                        <>
                          <Loader2 className="icon-sm text-muted-foreground shrink-0 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <FileText className="icon-sm text-muted-foreground shrink-0" />
                          PDF
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload('md')}
                      className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
                    >
                      <FileCode className="icon-sm text-muted-foreground shrink-0" />
                      Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload('json')}
                      className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
                    >
                      <Braces className="icon-sm text-muted-foreground shrink-0" />
                      JSON
                    </button>
                  </div>
                </>
              )}
            </div>
            {toolbarTrailing}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-8 p-4">
          {OFFER_WORKBOOK_SECTIONS.map((section) => {
            const stepData = offer[section.dataKey as keyof Offer] as Record<string, unknown> | null
            if (!stepData) return null

            return (
              <StepSection
                key={section.dataKey}
                title={section.title}
                stepData={stepData}
                fields={section.fields}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
