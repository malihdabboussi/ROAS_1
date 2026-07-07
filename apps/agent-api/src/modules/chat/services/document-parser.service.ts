import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common'
import {
  assessDocumentTextQuality,
  buildDocumentIntelligenceMetadata,
  type DocumentIntelligenceMetadata,
} from '@vibey/api-shared'
import { DocumentExtractionService } from '../../brain/services/document-extraction.service'
import { GeminiOcrBillingContext, GeminiOcrService } from '../../brain/services/gemini-ocr.service'

/** Max raw attachment size for chat parsing (PDF, images, video, etc.) — same cap as video. */
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024 // 1GB
const AUTO_CONTEXT_PDF_MAX_PAGES = 20
const MAX_CONTEXT_TEXT_CHARS = 50_000

const SUPPORTED_TEXT_TYPES = [
  'application/pdf',
  'application/json',
  'application/xml',
  'application/x-yaml',
  'application/yaml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  'text/xml',
  'text/x-yaml',
  'text/yaml',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel.sheet.macroEnabled.12', // xlsm
  'application/vnd.ms-excel', // xls
]

const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export interface ParsedDocument {
  filename: string
  mimeType: string
  sizeBytes: number
  type: 'text' | 'image' | 'video'
  /** Extracted text content (for text documents) */
  text?: string
  /** Base64 data URL (for images) */
  dataUrl?: string
  /** Preview — first 200 chars of extracted text */
  preview?: string
  /** Signed URL to the original file in Supabase Storage (media bucket) */
  fileUrl?: string
  /** ID of the media_assets row for global access */
  mediaAssetId?: string
  /** PDF page count when known */
  pageCount?: number
  documentIntelligence?: DocumentIntelligenceMetadata
}

interface ParsedPdfText {
  text: string
  documentIntelligence: DocumentIntelligenceMetadata
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name)

  constructor(
    @Optional() private readonly _geminiOcr?: GeminiOcrService,
    @Optional() private readonly documentExtraction?: DocumentExtractionService,
  ) {}

  async parse(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    billing?: GeminiOcrBillingContext,
  ): Promise<ParsedDocument[]> {
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(mimeType)
    const maxFileSize = MAX_UPLOAD_BYTES

    // Validate size
    if (buffer.length > maxFileSize) {
      throw new BadRequestException(
        `File too large: ${filename} (${Math.round(buffer.length / 1024 / 1024)}MB, max ${Math.round(maxFileSize / 1024 / 1024)}MB)`,
      )
    }

    // Classify type
    const isText = SUPPORTED_TEXT_TYPES.includes(mimeType)
    const isImage = SUPPORTED_IMAGE_TYPES.includes(mimeType)
    const isUnknown = !isText && !isImage && !isVideo

    if (isVideo) {
      return [
        {
          filename,
          mimeType,
          sizeBytes: buffer.length,
          type: 'video',
        },
      ]
    }

    if (isImage) {
      const base64 = buffer.toString('base64')
      const dataUrl = `data:${mimeType};base64,${base64}`
      return [
        {
          filename,
          mimeType,
          sizeBytes: buffer.length,
          type: 'image',
          dataUrl,
        },
      ]
    }

    if (isUnknown) {
      this.logger.log(`Unknown file type ${mimeType} for ${filename} — storing without extraction`)
      return [
        {
          filename,
          mimeType,
          sizeBytes: buffer.length,
          type: 'text',
        },
      ]
    }

    if (mimeType === 'application/pdf') {
      const pageCount = await this.countPdfPages(buffer)
      if (pageCount > AUTO_CONTEXT_PDF_MAX_PAGES) {
        const assessment = assessDocumentTextQuality({
          text: '',
          pageCount,
          mimeType,
          filename,
        })
        return [
          {
            filename,
            mimeType,
            sizeBytes: buffer.length,
            type: 'text',
            pageCount,
            preview: `(${pageCount}-page PDF — use read_document)`,
            documentIntelligence: buildDocumentIntelligenceMetadata({
              status: 'ready',
              strategy: 'native_file',
              assessment,
            }),
          },
        ]
      }
    } else if (
      buffer.length > 2 * 1024 * 1024 &&
      (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel.sheet.macroEnabled.12' ||
        mimeType === 'application/vnd.ms-excel')
    ) {
      return [
        {
          filename,
          mimeType,
          sizeBytes: buffer.length,
          type: 'text',
          preview: '(Large document — use read_document)',
        },
      ]
    }

    // Text extraction
    let text = ''
    let documentIntelligence: DocumentIntelligenceMetadata | undefined
    let pageCount: number | undefined
    try {
      if (mimeType === 'application/pdf') {
        pageCount = await this.countPdfPages(buffer)
        const parsedPdf = await this.parsePdf(buffer, filename, billing, pageCount)
        text = parsedPdf.text
        documentIntelligence = parsedPdf.documentIntelligence
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        text = await this.parseDocx(buffer, filename, billing)
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ) {
        text = await this.parsePptx(buffer, filename, billing)
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel.sheet.macroEnabled.12' ||
        mimeType === 'application/vnd.ms-excel'
      ) {
        text = await this.parseXlsx(buffer)
      } else {
        // TXT, MD, CSV, TSV, JSON, XML, YAML, DOC fallback — all readable as UTF-8
        text = buffer.toString('utf-8')
      }
    } catch (err) {
      this.logger.error(`Failed to parse ${filename}: ${err}`)
      throw new BadRequestException(
        `Failed to parse ${filename}: ${err instanceof Error ? err.message : 'unknown error'}`,
      )
    }

    return [
      {
        filename,
        mimeType,
        sizeBytes: buffer.length,
        type: 'text',
        text: this.truncateForContext(text),
        preview: text.slice(0, 200),
        ...(mimeType === 'application/pdf' ? { pageCount } : {}),
        ...(documentIntelligence ? { documentIntelligence } : {}),
      },
    ]
  }

  private async parsePdf(
    buffer: Buffer,
    filename?: string,
    billing?: GeminiOcrBillingContext,
    pageCount?: number,
  ): Promise<ParsedPdfText> {
    const mod = await import('pdf-parse')
    const pdfParse = typeof mod.default === 'function' ? mod.default : (mod as any)
    const result = await pdfParse(buffer)
    const text = String(result.text ?? '').trim()
    const nativeAssessment = assessDocumentTextQuality({
      text,
      pageCount,
      mimeType: 'application/pdf',
      filename,
    })
    if (nativeAssessment.quality === 'usable') {
      return {
        text,
        documentIntelligence: buildDocumentIntelligenceMetadata({
          status: 'ready',
          strategy: 'native_text',
          assessment: nativeAssessment,
          nativeChars: text.length,
        }),
      }
    }
    if (!this._geminiOcr) {
      return {
        text: '',
        documentIntelligence: buildDocumentIntelligenceMetadata({
          status: 'ready',
          strategy: 'native_file',
          assessment: nativeAssessment,
          nativeChars: text.length,
        }),
      }
    }

    let ocrText = ''
    try {
      ocrText = await this._geminiOcr.extractTextFromDocument(
        buffer,
        'application/pdf',
        filename,
        billing,
      )
    } catch (error) {
      return {
        text: '',
        documentIntelligence: buildDocumentIntelligenceMetadata({
          status: 'ready',
          strategy: 'native_file',
          assessment: nativeAssessment,
          nativeChars: text.length,
          error: error instanceof Error ? error.message : String(error),
        }),
      }
    }
    const ocrAssessment = assessDocumentTextQuality({
      text: ocrText,
      pageCount,
      mimeType: 'application/pdf',
      filename,
    })
    if (ocrAssessment.quality === 'usable') {
      return {
        text: ocrText,
        documentIntelligence: buildDocumentIntelligenceMetadata({
          status: 'ready',
          strategy: 'ocr',
          assessment: ocrAssessment,
          nativeChars: text.length,
          ocrChars: ocrText.length,
        }),
      }
    }

    return {
      text: '',
      documentIntelligence: buildDocumentIntelligenceMetadata({
        status: 'ready',
        strategy: 'native_file',
        assessment: ocrAssessment,
        nativeChars: text.length,
        ocrChars: ocrText.length,
      }),
    }
  }

  private async parseDocx(
    buffer: Buffer,
    _filename?: string,
    _billing?: GeminiOcrBillingContext,
  ): Promise<string> {
    const mod = await import('mammoth')
    const mammoth = mod.default ?? mod
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  private async parsePptx(
    buffer: Buffer,
    filename?: string,
    billing?: GeminiOcrBillingContext,
  ): Promise<string> {
    if (this.documentExtraction) {
      return this.documentExtraction.extractText(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        filename ?? 'presentation.pptx',
        billing,
      )
    }
    if (!this._geminiOcr) return ''
    return this._geminiOcr.extractTextFromDocument(
      buffer,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      filename,
      billing,
    )
  }

  private async parseXlsx(buffer: Buffer): Promise<string> {
    const mod = await import('xlsx')
    const XLSX = mod.default ?? mod
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const lines: string[] = []
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name]
      if (!sheet) continue
      lines.push(`--- Sheet: ${name} ---`)
      const csv = XLSX.utils.sheet_to_csv(sheet)
      lines.push(csv)
    }
    return lines.join('\n')
  }

  private async countPdfPages(buffer: Buffer): Promise<number> {
    try {
      const mod = await import('pdf-lib')
      const PDFDocument = mod.PDFDocument
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      return doc.getPageCount()
    } catch {
      return 0
    }
  }

  private truncateForContext(text: string): string {
    if (text.length <= MAX_CONTEXT_TEXT_CHARS) return text
    return `${text.slice(0, MAX_CONTEXT_TEXT_CHARS)}\n\n[...truncated ${text.length - MAX_CONTEXT_TEXT_CHARS} characters]`
  }
}
