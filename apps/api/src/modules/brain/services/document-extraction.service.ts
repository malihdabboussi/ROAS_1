import { Injectable } from '@nestjs/common'
import { extractText, getDocumentProxy } from 'unpdf'
import { assessDocumentTextQuality, ErrorReporter } from '@vibey/api-shared'
import { GeminiOcrBillingContext, GeminiOcrService } from './gemini-ocr.service'

@Injectable()
export class DocumentExtractionService {
  constructor(
    private readonly geminiOcr: GeminiOcrService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  async extractText(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    billing?: GeminiOcrBillingContext,
  ): Promise<string> {
    try {
      return await this.extractTextInner(buffer, mimeType, filename, billing)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.errorReporter.report({
        app: process.env.APP_NAME ?? 'api',
        category: 'integration',
        feature: 'brain/document_extraction',
        error_code: 'extract_failed',
        message: msg,
        stack: err instanceof Error ? err.stack : undefined,
        user_id: billing?.userId,
        context: { filename, mimeType },
      })
      if (err instanceof Error) {
        Object.defineProperty(err, '__appErrorReported', { value: true, enumerable: false })
      }
      throw err
    }
  }

  private async extractTextInner(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    billing?: GeminiOcrBillingContext,
  ): Promise<string> {
    const ext = filename.toLowerCase().split('.').pop() ?? ''
    const normalizedMimeType = mimeType.toLowerCase()
    const isPdf = normalizedMimeType === 'application/pdf' || ext === 'pdf'
    const isDocx =
      normalizedMimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      normalizedMimeType === 'application/msword' ||
      ext === 'docx' ||
      ext === 'doc'
    const isPptx =
      normalizedMimeType ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      ext === 'pptx'
    const isSpreadsheet =
      normalizedMimeType === 'application/vnd.ms-excel' ||
      normalizedMimeType === 'application/vnd.ms-excel.sheet.macroenabled.12' ||
      normalizedMimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      ext === 'xls' ||
      ext === 'xlsx' ||
      ext === 'xlsm'
    const isImage =
      normalizedMimeType.startsWith('image/') ||
      ext === 'png' ||
      ext === 'jpg' ||
      ext === 'jpeg' ||
      ext === 'webp' ||
      ext === 'gif' ||
      ext === 'bmp' ||
      ext === 'tif' ||
      ext === 'tiff' ||
      ext === 'heic' ||
      ext === 'heif'

    if (isPdf) {
      const pdf = await getDocumentProxy(new Uint8Array(buffer))
      const { text } = await extractText(pdf, { mergePages: true })
      const extracted = (text ?? '').trim()
      const assessment = assessDocumentTextQuality({
        text: extracted,
        pageCount: pdf.numPages,
        mimeType: 'application/pdf',
        filename,
      })
      if (assessment.quality === 'usable') return extracted
      return this.geminiOcr.extractTextFromDocument(buffer, 'application/pdf', filename, billing)
    }
    if (isDocx) {
      const mod = await import('mammoth')
      const mammoth = mod.default ?? mod
      const result = await mammoth.extractRawText({ buffer })
      const extracted = (result?.value ?? '').trim()
      if (extracted.length > 0) return extracted
      // Image-only DOCX — fall back to Gemini OCR
      return this.geminiOcr.extractTextFromImage(buffer, mimeType, filename, billing)
    }
    if (isPptx) {
      // PPTX has no reliable text-layer extractor — route directly to Gemini OCR
      return this.geminiOcr.extractTextFromImage(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        filename,
        billing,
      )
    }
    if (isSpreadsheet) {
      return this.extractSpreadsheetText(buffer)
    }
    if (isImage) {
      const imageMimeType = normalizedMimeType.startsWith('image/')
        ? normalizedMimeType
        : this.resolveImageMimeTypeFromExtension(ext)
      return this.geminiOcr.extractTextFromImage(buffer, imageMimeType, filename, billing)
    }
    throw new Error(`Unsupported document type: ${mimeType} (${filename})`)
  }

  private async extractSpreadsheetText(buffer: Buffer): Promise<string> {
    const mod = await import('xlsx')
    const XLSX = mod.default ?? mod
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const lines: string[] = []
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name]
      if (!sheet) continue
      lines.push(`--- Sheet: ${name} ---`)
      lines.push(XLSX.utils.sheet_to_csv(sheet))
    }
    return lines.join('\n').trim()
  }

  private resolveImageMimeTypeFromExtension(ext: string): string {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'webp':
        return 'image/webp'
      case 'gif':
        return 'image/gif'
      case 'bmp':
        return 'image/bmp'
      case 'tif':
      case 'tiff':
        return 'image/tiff'
      case 'heic':
        return 'image/heic'
      case 'heif':
        return 'image/heif'
      default:
        return 'image/png'
    }
  }
}
