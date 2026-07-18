import { toast } from 'sonner'
import { htmlToPlainTextPreview } from '@/features/spaces/components/space-item-values'
import {
  downloadDocx,
  downloadHTML,
  downloadMarkdown,
  exportCampaignMarkdownDomToPdf,
  sanitizeFilename,
} from '@/lib/artifacts'
import { buildSpaceDocExportHtml } from '@/lib/spaces/space-doc-export'
import { createSpaceDocVisualPdfBlob } from '@/lib/spaces/space-doc-visual-pdf-export'

function buildExportContentRoot(title: string, docBodyHtml: string): HTMLElement {
  const root = document.createElement('div')
  root.style.cssText = 'font-family:system-ui,sans-serif;color:#111;line-height:1.6'
  const heading = document.createElement('h1')
  heading.style.cssText = 'font-size:22px;font-weight:700;margin:0 0 16px'
  heading.textContent = title.trim() || 'Untitled'
  root.appendChild(heading)
  const body = document.createElement('div')
  body.style.cssText = 'font-size:14px'
  body.innerHTML = docBodyHtml
  root.appendChild(body)
  return root
}

export function spaceDocHasExportableBody(docBody: string | null | undefined): boolean {
  return Boolean(docBody?.trim())
}

export function canExportSpaceDoc(options: {
  customData?: Record<string, unknown> | null
  docBody: string | null | undefined
  visualHtml?: string | null
}): {
  canExport: boolean
  canExportDocBody: boolean
  hasVisualHtml: boolean
} {
  const docCustomData = options.customData ?? {}
  const isFolderDoc = (docCustomData._doc_kind as string | undefined) === 'folder'
  const isDriveDoc = (docCustomData._doc_source as string | undefined) === 'drive'
  const docBody = options.docBody?.trim() ?? ''
  const visualHtml =
    typeof options.visualHtml === 'string' && options.visualHtml.trim()
      ? options.visualHtml.trim()
      : null
  const canExportDocBody = spaceDocHasExportableBody(docBody)
  const hasVisualHtml = Boolean(visualHtml)
  return {
    canExport: !isFolderDoc && !isDriveDoc && (canExportDocBody || hasVisualHtml),
    canExportDocBody,
    hasVisualHtml,
  }
}

export async function exportSpaceDocPdf(options: {
  title: string
  docBody: string
  campaignId?: string | null
}): Promise<void> {
  const host = document.createElement('div')
  host.style.cssText =
    'position:fixed;left:-100000px;top:0;width:186mm;opacity:0;pointer-events:none'
  host.setAttribute('aria-hidden', 'true')
  const root = buildExportContentRoot(options.title, options.docBody)
  host.appendChild(root)
  document.body.appendChild(host)
  try {
    await new Promise((r) => setTimeout(r, 200))
    await exportCampaignMarkdownDomToPdf({
      contentElement: root,
      campaignId: options.campaignId ?? null,
      filenameBase: sanitizeFilename(options.title, 'doc'),
      preferPrintPipeline: false,
    })
  } catch {
    toast.error('Failed to export doc as PDF')
  } finally {
    host.parentNode?.removeChild(host)
  }
}

export function exportSpaceDocMarkdown(title: string, docBody: string): void {
  const plain = htmlToPlainTextPreview(docBody)
  const heading = title.trim() || 'Untitled'
  const content = plain ? `# ${heading}\n\n${plain}` : `# ${heading}\n`
  downloadMarkdown(content, heading, 'doc')
}

export function exportSpaceDocHtml(title: string, docBody: string): void {
  const heading = title.trim() || 'Untitled'
  downloadHTML(buildSpaceDocExportHtml(heading, docBody), heading)
}

export async function exportSpaceDocDocx(title: string, docBody: string): Promise<void> {
  const heading = title.trim() || 'Untitled'
  try {
    const blob = await createSpaceDocDocxBlob(heading, docBody)
    downloadDocx(blob, heading, 'doc')
  } catch {
    toast.error('Failed to export doc as DOCX')
  }
}

export async function createSpaceDocDocxBlob(title: string, docBody: string): Promise<Blob> {
  const res = await fetch('/api/spaces/export-docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title.trim() || 'Untitled', docBody }),
  })
  if (!res.ok) throw new Error('DOCX export failed')
  return res.blob()
}

export function exportSpaceDocVisualHtml(title: string, visualHtml: string): void {
  downloadHTML(visualHtml, `${title.trim() || 'Untitled'}-visual`)
}

export async function createSpaceDocCanvaFile(options: {
  title: string
  docBody: string
  visualHtml?: string | null
}): Promise<{ blob: Blob; filename: string }> {
  const title = options.title.trim() || 'Untitled'
  if (options.visualHtml?.trim()) {
    return {
      blob: await createSpaceDocVisualPdfBlob({ title, visualHtml: options.visualHtml }),
      filename: `${sanitizeFilename(`${title} visual`, 'visual-doc')}.pdf`,
    }
  }
  return {
    blob: await createSpaceDocDocxBlob(title, options.docBody),
    filename: `${sanitizeFilename(title, 'doc')}.docx`,
  }
}

export { exportSpaceDocVisualPdf } from '@/lib/spaces/space-doc-visual-pdf-export'
