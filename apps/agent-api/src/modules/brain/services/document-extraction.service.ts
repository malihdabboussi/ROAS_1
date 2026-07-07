import { Injectable } from '@nestjs/common'
import { extractText, getDocumentProxy } from 'unpdf'
import { GeminiOcrBillingContext, GeminiOcrService } from './gemini-ocr.service'

const PRESENTATION_SOURCE_EXTRACTION_PROMPT = `Extract this presentation source slide by slide.
Return plain UTF-8 text only.
Do not summarize.
For each slide, include:
- Slide number and title or main heading
- All readable body text and speaker notes
- Tables, chart labels, axis labels, legends, and visible numeric values when readable
- Image, icon, diagram, and embedded object descriptions when visible
- Layout cues such as columns, hero image, footer, repeated header, color palette, and visual hierarchy
If a slide has no readable text, still include a brief visual/layout description.
Keep slide order exactly as in the source.`

@Injectable()
export class DocumentExtractionService {
  constructor(private readonly geminiOcr: GeminiOcrService) {}

  async extractText(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    billing?: GeminiOcrBillingContext,
  ): Promise<string> {
    const ext = filename.toLowerCase().split('.').pop() ?? ''
    const isPdf = mimeType === 'application/pdf' || ext === 'pdf'
    const isDocx =
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      ext === 'docx' ||
      ext === 'doc'
    const isPptx =
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      ext === 'pptx'
    const isImage =
      mimeType.startsWith('image/') ||
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
      if (extracted.length > 0) return extracted
      // Text layer is empty — PDF is image-based (e.g. exported from PowerPoint).
      // Fall back to Gemini OCR which natively supports application/pdf inline data.
      return this.geminiOcr.extractTextFromImage(buffer, 'application/pdf', filename, billing)
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
      return this.geminiOcr.extractTextFromDocument(
        buffer,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        filename,
        billing,
        { prompt: PRESENTATION_SOURCE_EXTRACTION_PROMPT },
      )
    }
    if (isImage) {
      const normalizedMimeType = mimeType.startsWith('image/')
        ? mimeType
        : this.resolveImageMimeTypeFromExtension(ext)
      return this.geminiOcr.extractTextFromImage(buffer, normalizedMimeType, filename, billing)
    }
    throw new Error(`Unsupported document type: ${mimeType} (${filename})`)
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
