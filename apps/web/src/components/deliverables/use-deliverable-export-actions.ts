'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { exportPresentationDeliverable } from '@/components/deliverables/deliverable-presentation-export'
import { normalizeDeliverableContent } from '@/components/deliverables/normalize-deliverable-content'
import type { DeliverableEntityExportFormat } from '@/components/deliverables/deliverable-preview-modal.types'
import {
  ARTIFACT_HTML2PDF_PAGEBREAK,
  ARTIFACT_INLINE_ERRORS,
  buildAvatarPdfExportRoot,
  buildOfferPdfExportRoot,
  downloadJSON,
  downloadMarkdown,
  exportCampaignMarkdownDomToPdf,
  sanitizeFilename,
  stampMadeWithVibeyFooterOnAllPages,
  triggerRemotePdfDownload,
} from '@/lib/artifacts'
import type { MissionDeliverable } from '@/lib/missions'

export function useDeliverableExportActions({
  deliverable,
  campaignId,
  hasSourcePdfFile,
  isTextType,
  isEntityType,
  entityData,
  entityTextContent,
  effectiveMarkdown,
}: {
  deliverable: MissionDeliverable
  campaignId: string | null
  hasSourcePdfFile: boolean
  isTextType: boolean
  isEntityType: boolean
  entityData: unknown
  entityTextContent: string | null
  /** Resolved body for channel-mapped / entity-backed docs when `deliverable.content` is empty */
  effectiveMarkdown: string | null
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const exportFooterTriggerRef = useRef<HTMLButtonElement>(null)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const markdownSource = deliverable.content || effectiveMarkdown

  useEffect(() => {
    if (!exportOpen) return
    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (exportFooterTriggerRef.current?.contains(t)) return
      if (t.closest('[data-dropdown="export-deliverable"]')) return
      setExportOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exportOpen])

  const handleExportPdf = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    try {
      if (hasSourcePdfFile && deliverable.file_url) {
        triggerRemotePdfDownload(deliverable.file_url, deliverable.file_name, deliverable.title)
        return
      }

      if (!contentRef.current) return
      const filenameBase =
        deliverable.file_name?.replace(/\.[^/.]+$/, '') ||
        sanitizeFilename(deliverable.title ?? 'deliverable', 'deliverable')
      await exportCampaignMarkdownDomToPdf({
        contentElement: contentRef.current,
        campaignId: campaignId ?? deliverable.campaign_id ?? null,
        filenameBase,
        preferPrintPipeline: !!(isTextType && markdownSource),
      })
    } finally {
      setExporting(false)
    }
  }, [
    campaignId,
    deliverable.campaign_id,
    deliverable.file_name,
    deliverable.file_url,
    deliverable.title,
    exporting,
    hasSourcePdfFile,
    isTextType,
    markdownSource,
  ])

  const handleCopy = useCallback(async () => {
    if (!markdownSource || copied) return
    await navigator.clipboard.writeText(normalizeDeliverableContent(markdownSource))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [markdownSource, copied])

  const handleExportMd = useCallback(() => {
    if (!markdownSource) return
    downloadMarkdown(
      normalizeDeliverableContent(markdownSource),
      deliverable.title ?? 'deliverable',
      'deliverable',
    )
  }, [markdownSource, deliverable.title])

  const handleEntityExport = useCallback(
    async (format: DeliverableEntityExportFormat) => {
      if (!entityData || !isEntityType || exporting) return
      const t = deliverable.type
      const title = deliverable.title ?? 'deliverable'

      if (format === 'md' && entityTextContent) {
        downloadMarkdown(entityTextContent, title, 'deliverable')
        return
      }
      if (format === 'json') {
        downloadJSON(entityData, title, 'deliverable')
        return
      }
      if (t === 'presentation' && (format === 'html' || format === 'pdf' || format === 'ppt')) {
        setExporting(true)
        try {
          await exportPresentationDeliverable({ format, deliverable, entityData, title })
        } catch (err) {
          console.error(`Failed to export presentation as ${format}:`, err)
          toast.error(ARTIFACT_INLINE_ERRORS.DOWNLOAD_FAILED)
        } finally {
          setExporting(false)
        }
        return
      }
      if (format === 'pdf') {
        setExporting(true)
        let cleanup: (() => void) | null = null
        try {
          const html2pdf = (await import('html2pdf.js')).default
          const basename = sanitizeFilename(title, 'deliverable')
          const PDF_MARGIN_MM: [number, number, number, number] = [12, 12, 18, 12]
          const PDF_CONTENT_WIDTH_MM = 210 - PDF_MARGIN_MM[1] - PDF_MARGIN_MM[3]

          const host = document.createElement('div')
          host.style.cssText = `position:fixed;left:-100000px;top:0;width:${PDF_CONTENT_WIDTH_MM}mm;opacity:0;pointer-events:none`
          host.setAttribute('aria-hidden', 'true')

          let scopeNode: HTMLElement
          let styles = ''
          if (t === 'offer') {
            const r = buildOfferPdfExportRoot(entityData as any)
            scopeNode = r.root
            styles = r.styles
          } else if (t === 'avatar') {
            const r = buildAvatarPdfExportRoot(entityData as any)
            scopeNode = r.root
            styles = r.styles
          } else if (t === 'sequence') {
            const seq = entityData as any
            const emails = [...(seq.sequence_emails ?? [])].sort(
              (a: any, b: any) => a.order_index - b.order_index,
            )
            scopeNode = document.createElement('div')
            scopeNode.style.cssText = 'font-family:system-ui,sans-serif;color:#111;line-height:1.6'
            emails.forEach((email: any, idx: number) => {
              const section = document.createElement('div')
              if (idx > 0) section.style.cssText = 'page-break-before:always;padding-top:12px'
              else section.style.cssText = 'padding-top:12px'
              const heading = document.createElement('h2')
              heading.style.cssText = 'font-size:16px;font-weight:700;margin:0 0 4px'
              heading.textContent = email.subject ?? `Email ${idx + 1}`
              section.appendChild(heading)
              const delay = document.createElement('p')
              delay.style.cssText = 'font-size:11px;color:#888;margin:0 0 12px'
              delay.textContent = idx === 0 ? 'First email' : `${email.delay_hours}h after previous`
              section.appendChild(delay)
              const body = document.createElement('div')
              body.style.cssText = 'font-size:13px'
              body.innerHTML = email.body ?? ''
              section.appendChild(body)
              scopeNode.appendChild(section)
            })
          } else {
            scopeNode = document.createElement('div')
            scopeNode.style.cssText =
              'font-family:system-ui,sans-serif;color:#111;line-height:1.6;white-space:pre-wrap;font-size:13px'
            scopeNode.textContent = entityTextContent ?? ''
          }

          if (styles) {
            const styleTag = document.createElement('style')
            styleTag.textContent = styles
            host.appendChild(styleTag)
          }
          host.appendChild(scopeNode)
          document.body.appendChild(host)
          cleanup = () => host.parentNode?.removeChild(host)
          await new Promise((r) => setTimeout(r, 250))

          const opt = {
            margin: PDF_MARGIN_MM,
            filename: `${basename}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
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
        } catch {
          toast.error('Failed to export as PDF')
        } finally {
          if (cleanup) cleanup()
          setExporting(false)
        }
      }
    },
    [entityData, entityTextContent, isEntityType, deliverable, exporting],
  )

  return {
    contentRef,
    exportFooterTriggerRef,
    exporting,
    copied,
    setCopied,
    exportOpen,
    setExportOpen,
    handleExportPdf,
    handleCopy,
    handleExportMd,
    handleEntityExport,
  }
}
