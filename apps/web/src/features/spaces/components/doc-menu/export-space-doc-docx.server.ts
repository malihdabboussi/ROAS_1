import HtmlToDocx from '@turbodocx/html-to-docx'
import { buildSpaceDocExportHtml } from '@/lib/spaces/space-doc-export'

async function docxBytesFromRendererOutput(value: unknown): Promise<Uint8Array> {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer())
  throw new Error('DOCX renderer returned unsupported output')
}

export async function renderSpaceDocDocxBytes(title: string, docBody: string): Promise<Uint8Array> {
  const heading = title.trim() || 'Untitled'
  const html = buildSpaceDocExportHtml(heading, docBody)
  const result = await HtmlToDocx(html, null, {
    title: heading,
    creator: 'ROAS',
    table: {
      row: { cantSplit: true },
      borderOptions: { size: 1, color: 'D1D5DB' },
    },
  })
  return docxBytesFromRendererOutput(result)
}
