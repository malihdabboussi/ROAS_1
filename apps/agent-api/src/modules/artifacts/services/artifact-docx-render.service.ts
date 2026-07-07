import { Injectable } from '@nestjs/common'
import HtmlToDocx from '@turbodocx/html-to-docx'

export type DocxContentFormat = 'markdown' | 'text' | 'html'

type MarkdownDocxPipeline = {
  unified: (typeof import('unified'))['unified']
  remarkParse: (typeof import('remark-parse'))['default']
  remarkGfm: (typeof import('remark-gfm'))['default']
  remarkDocx: (typeof import('remark-docx'))['default']
}

let markdownDocxPipeline: MarkdownDocxPipeline | null = null

async function loadMarkdownDocxPipeline(): Promise<MarkdownDocxPipeline> {
  if (markdownDocxPipeline) return markdownDocxPipeline
  const [{ unified }, { default: remarkParse }, { default: remarkGfm }, remarkDocxMod] =
    await Promise.all([
      import('unified'),
      import('remark-parse'),
      import('remark-gfm'),
      import('remark-docx'),
    ])
  const remarkDocx = (remarkDocxMod.default ??
    remarkDocxMod) as unknown as MarkdownDocxPipeline['remarkDocx']
  markdownDocxPipeline = { unified, remarkParse, remarkGfm, remarkDocx }
  return markdownDocxPipeline
}

@Injectable()
export class ArtifactDocxRenderService {
  normalizeDocxContentFormat(value: unknown): DocxContentFormat {
    if (value === 'text' || value === 'html') return value
    return 'markdown'
  }

  detectHtmlContent(content: string, declaredFormat: DocxContentFormat): DocxContentFormat {
    if (declaredFormat !== 'markdown') return declaredFormat
    const trimmed = content.trimStart()
    if (/^<!doctype\s/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return 'html'
    const blockTags = ['<h1', '<h2', '<h3', '<p>', '<p ', '<div', '<table', '<ul', '<ol', '<body']
    const distinctHits = blockTags.filter((tag) => content.toLowerCase().includes(tag)).length
    if (distinctHits >= 1) return 'html'
    return declaredFormat
  }

  normalizeDocxFileName(fileNameInput: unknown, title: string): string {
    const safeBase = (
      typeof fileNameInput === 'string' && fileNameInput.trim().length > 0
        ? fileNameInput.trim()
        : title
    )
      .toLowerCase()
      .replace(/[^a-z0-9-_ .]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .replace(/\.docx$/i, '')
    const finalBase = safeBase.length > 0 ? safeBase : `document-${Date.now()}`
    return `${finalBase}.docx`
  }

  async generateDocxBytes(input: {
    title: string
    content: string
    contentFormat: DocxContentFormat
  }): Promise<Uint8Array> {
    if (input.contentFormat === 'markdown') {
      return this.generateMarkdownDocxBytes(input.title, input.content)
    }
    const html =
      input.contentFormat === 'html'
        ? this.ensureHtmlDocument(input.content, input.title)
        : this.textToHtmlDocument(input.content, input.title)
    const result = await HtmlToDocx(html, null, {
      title: input.title || 'Document',
      creator: 'Vibey',
      table: {
        row: { cantSplit: true },
        borderOptions: { size: 1, color: 'D1D5DB' },
      },
    })
    return this.toUint8Array(result)
  }

  private async generateMarkdownDocxBytes(title: string, content: string): Promise<Uint8Array> {
    const { unified, remarkParse, remarkGfm, remarkDocx } = await loadMarkdownDocxPipeline()
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkDocx, {
        title: title || 'Document',
        creator: 'Vibey',
      })
    const file = await processor.process(content)
    const result = await Promise.resolve(file.result)
    return this.toUint8Array(result)
  }

  private ensureHtmlDocument(html: string, title: string): string {
    const trimmed = html.trim()
    if (/^<!doctype\s/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return trimmed
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${this.escapeHtml(
      title || 'Document',
    )}</title></head><body>${trimmed}</body></html>`
  }

  private textToHtmlDocument(text: string, title: string): string {
    const body = text
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${this.escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('')
    return this.ensureHtmlDocument(body || '<p></p>', title)
  }

  private toUint8Array(value: ArrayBuffer | Blob | Buffer | unknown): Uint8Array {
    if (value instanceof Uint8Array) return value
    if (value instanceof ArrayBuffer) return new Uint8Array(value)
    throw new Error('DOCX renderer returned unsupported output')
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}
