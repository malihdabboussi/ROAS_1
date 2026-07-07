import { Injectable } from '@nestjs/common'
import { getFontkit, getPdfLib, loadPdfFontBytes } from './artifact-pdf-render-support'
import { ArtifactPdfRenderNormalizerService } from './artifact-pdf-render-normalizer.service'
import { ArtifactPdfRenderTextService } from './artifact-pdf-render-text.service'
import type { PdfBlock, PdfContentFormat, PdfLayout, PdfTheme } from './artifact-pdf-render.types'

@Injectable()
export class ArtifactPdfRenderService {
  constructor(
    private readonly normalizer: ArtifactPdfRenderNormalizerService = new ArtifactPdfRenderNormalizerService(),
    private readonly textRenderer: ArtifactPdfRenderTextService = new ArtifactPdfRenderTextService(),
  ) {}

  normalizePdfLayout(value: unknown): PdfLayout {
    return this.normalizer.normalizePdfLayout(value)
  }

  normalizePdfContentFormat(value: unknown): PdfContentFormat {
    return this.normalizer.normalizePdfContentFormat(value)
  }

  detectHtmlContent(content: string, declaredFormat: PdfContentFormat): PdfContentFormat {
    return this.normalizer.detectHtmlContent(content, declaredFormat)
  }

  normalizePdfPadding(value: unknown, layout: PdfLayout): number {
    return this.normalizer.normalizePdfPadding(value, layout)
  }

  normalizePdfImageUrls(value: unknown): string[] {
    return this.normalizer.normalizePdfImageUrls(value)
  }

  normalizePdfTheme(value: unknown): PdfTheme {
    return this.normalizer.normalizePdfTheme(value)
  }

  normalizePdfFileName(fileNameInput: unknown, title: string): string {
    return this.normalizer.normalizePdfFileName(fileNameInput, title)
  }

  async generateStyledPdfBytes(input: {
    title: string
    content: string
    contentFormat: PdfContentFormat
    imageUrls: string[]
    layout: PdfLayout
    padding: number
    theme: PdfTheme
  }): Promise<Uint8Array> {
    const { PDFDocument, rgb } = getPdfLib()
    const fontkit = getFontkit()
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const fontBytes = loadPdfFontBytes()
    const embeddedFonts =
      fontBytes.mode === 'noto'
        ? {
            mode: 'noto' as const,
            latin: await pdfDoc.embedFont(fontBytes.latinRegular),
            latinBold: await pdfDoc.embedFont(fontBytes.latinBold),
            hebrew: await pdfDoc.embedFont(fontBytes.hebrewRegular),
            hebrewBold: await pdfDoc.embedFont(fontBytes.hebrewBold),
          }
        : {
            mode: 'ubuntu' as const,
            latin: await pdfDoc.embedFont(fontBytes.regular),
            latinBold: await pdfDoc.embedFont(fontBytes.bold),
          }
    const boldFont = embeddedFonts.latinBold
    const dimensions =
      input.layout === '16:9' ? { width: 960, height: 540 } : { width: 595.28, height: 841.89 }
    const primary = this.textRenderer.hexToRgbColor(input.theme.primary)
    const accent = this.textRenderer.hexToRgbColor(input.theme.accent)
    const textColor = this.textRenderer.hexToRgbColor(input.theme.text)
    const mutedColor = this.textRenderer.hexToRgbColor(input.theme.muted)
    const bgColor = this.textRenderer.hexToRgbColor(input.theme.background)
    const blocks = this.textRenderer.toStyledPdfBlocks(input.content, input.contentFormat)
    const extractedImageUrls = this.extractImageUrlsFromContent(input.content, input.contentFormat)
    const mergedImageUrls = [...new Set([...input.imageUrls, ...extractedImageUrls])]

    const lineHeight = input.layout === '16:9' ? 16 : 17
    const bodyFontSize = input.layout === '16:9' ? 11 : 12
    const maxWidth = dimensions.width - input.padding * 2
    const drawPageFrame = (page: any) => {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      })
      page.drawRectangle({
        x: 0,
        y: dimensions.height - 10,
        width: dimensions.width,
        height: 10,
        color: rgb(primary.r, primary.g, primary.b),
      })
    }

    let page = pdfDoc.addPage([dimensions.width, dimensions.height])
    drawPageFrame(page)
    let y = dimensions.height - input.padding

    const titleFontSize = input.layout === '16:9' ? 28 : 32
    const titleLineHeight = titleFontSize + 8
    const safeTitle =
      this.textRenderer.sanitizePdfTextForWinAnsi(input.title).replace(/\n+/g, ' ').trim() ||
      'Untitled'
    const titleLines = this.textRenderer.wrapPdfTextLine(
      safeTitle,
      embeddedFonts,
      titleFontSize,
      maxWidth,
      'bold',
    )
    for (const titleLine of titleLines) {
      this.textRenderer.drawPdfVisualLine(
        page,
        titleLine,
        input.padding,
        y,
        titleFontSize,
        textColor,
        embeddedFonts,
        'bold',
      )
      y -= titleLineHeight
    }
    y -= 6
    page.drawLine({
      start: { x: input.padding, y },
      end: { x: input.padding + Math.min(220, maxWidth), y },
      thickness: 3,
      color: rgb(accent.r, accent.g, accent.b),
    })
    y -= 20

    const ensureSpace = (requiredHeight: number) => {
      if (y - requiredHeight >= input.padding) return
      page = pdfDoc.addPage([dimensions.width, dimensions.height])
      drawPageFrame(page)
      y = dimensions.height - input.padding
    }

    for (const block of blocks) {
      const safeBlockText = this.textRenderer.sanitizePdfTextForWinAnsi(block.text)

      if (block.type === 'divider') {
        ensureSpace(16)
        y -= 6
        page.drawLine({
          start: { x: input.padding, y },
          end: { x: dimensions.width - input.padding, y },
          thickness: 0.5,
          color: rgb(mutedColor.r, mutedColor.g, mutedColor.b),
        })
        y -= 10
        continue
      }

      if (block.type === 'table' && block.rows && block.rows.length > 0) {
        y = this.drawTableBlock({
          block,
          page,
          y,
          input,
          maxWidth,
          dimensions,
          bodyFontSize,
          primary,
          textColor,
          mutedColor,
          accent,
          embeddedFonts,
          ensureSpace,
        })
        continue
      }

      if (block.type === 'heading') {
        const size = block.level === 1 ? 22 : block.level === 2 ? 18 : 15
        const height = size + 10
        ensureSpace(height + 20)
        y -= 8
        const headingLines = this.textRenderer.wrapPdfTextLine(
          safeBlockText.replace(/\n+/g, ' ').trim(),
          embeddedFonts,
          size,
          maxWidth,
          'bold',
        )
        for (const hLine of headingLines) {
          this.textRenderer.drawPdfVisualLine(
            page,
            hLine,
            input.padding,
            y,
            size,
            textColor,
            embeddedFonts,
            'bold',
          )
          y -= height
        }
        if ((block.level ?? 1) <= 2) {
          page.drawLine({
            start: { x: input.padding, y: y + 4 },
            end: { x: dimensions.width - input.padding, y: y + 4 },
            thickness: 0.5,
            color: rgb(accent.r * 0.6, accent.g * 0.6, accent.b * 0.6),
          })
          y -= 8
        } else {
          y -= 4
        }
        continue
      }

      if (block.type === 'bullet') {
        const wrapped = this.textRenderer.wrapPdfTextLine(
          safeBlockText,
          embeddedFonts,
          bodyFontSize,
          maxWidth - 18,
          'regular',
        )
        ensureSpace(wrapped.length * lineHeight + 6)
        let bulletY = y
        page.drawText('\u2022', {
          x: input.padding,
          y: bulletY,
          size: bodyFontSize,
          font: boldFont,
          color: rgb(accent.r, accent.g, accent.b),
        })
        for (const line of wrapped) {
          this.textRenderer.drawPdfVisualLine(
            page,
            line,
            input.padding + 14,
            bulletY,
            bodyFontSize,
            textColor,
            embeddedFonts,
            'regular',
          )
          bulletY -= lineHeight
        }
        y = bulletY - 4
        continue
      }

      const wrapped = this.textRenderer.wrapPdfTextLine(
        safeBlockText,
        embeddedFonts,
        bodyFontSize,
        maxWidth,
        'regular',
      )
      ensureSpace(wrapped.length * lineHeight + 10)
      for (const line of wrapped) {
        this.textRenderer.drawPdfVisualLine(
          page,
          line,
          input.padding,
          y,
          bodyFontSize,
          textColor,
          embeddedFonts,
          'regular',
        )
        y -= lineHeight
      }
      y -= 8
    }

    if (mergedImageUrls.length > 0) {
      ensureSpace(36)
      this.textRenderer.drawPdfShapedLine(
        page,
        'Visual References',
        input.padding,
        y,
        15,
        textColor,
        embeddedFonts,
        'bold',
      )
      y -= 24
    }

    for (const imageUrl of mergedImageUrls) {
      try {
        const imageRes = await fetch(imageUrl)
        if (!imageRes.ok) continue
        const bytes = await imageRes.arrayBuffer()
        const contentType = (imageRes.headers.get('content-type') || '').toLowerCase()
        const image =
          contentType.includes('png') || imageUrl.toLowerCase().endsWith('.png')
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes)
        const maxImageWidth = maxWidth
        const maxImageHeight = input.layout === '16:9' ? 180 : 280
        const scale = Math.min(maxImageWidth / image.width, maxImageHeight / image.height, 1)
        const drawWidth = image.width * scale
        const drawHeight = image.height * scale
        ensureSpace(drawHeight + 20)
        page.drawImage(image, {
          x: input.padding,
          y: y - drawHeight,
          width: drawWidth,
          height: drawHeight,
        })
        y -= drawHeight + 16
      } catch {
        ensureSpace(18)
        this.textRenderer.drawPdfShapedLine(
          page,
          `Image skipped: ${imageUrl}`,
          input.padding,
          y,
          10,
          mutedColor,
          embeddedFonts,
          'regular',
        )
        y -= 16
      }
    }

    return pdfDoc.save()
  }

  private extractImageUrlsFromContent(content: string, format: PdfContentFormat): string[] {
    return this.normalizer.extractImageUrlsFromContent(content, format)
  }

  private toStyledPdfBlocks(content: string, format: PdfContentFormat): PdfBlock[] {
    return this.textRenderer.toStyledPdfBlocks(content, format)
  }

  private drawTableBlock(input: {
    block: PdfBlock
    page: any
    y: number
    input: { padding: number }
    maxWidth: number
    dimensions: { width: number }
    bodyFontSize: number
    primary: { r: number; g: number; b: number }
    textColor: { r: number; g: number; b: number }
    mutedColor: { r: number; g: number; b: number }
    accent: { r: number; g: number; b: number }
    embeddedFonts: Parameters<ArtifactPdfRenderTextService['wrapPdfTextLine']>[1]
    ensureSpace: (requiredHeight: number) => void
  }): number {
    const { rgb } = getPdfLib()
    const rows = input.block.rows ?? []
    const colCount = Math.max(...rows.map((r) => r.length))
    if (colCount === 0) return input.y
    const colWidth = input.maxWidth / colCount
    const cellFontSize = input.bodyFontSize - 1
    const cellLineH = cellFontSize + 6
    const rowHeight = cellLineH + 8
    input.ensureSpace(rows.length * rowHeight + 16)
    let y = input.y
    let isHeader = true
    for (const row of rows) {
      const rowColor = isHeader ? input.primary : input.textColor
      for (let ci = 0; ci < colCount; ci++) {
        const cellText = this.textRenderer.sanitizePdfTextForWinAnsi(row[ci] ?? '')
        const cellX = input.input.padding + ci * colWidth
        if (isHeader) {
          input.page.drawRectangle({
            x: cellX,
            y: y - rowHeight + 4,
            width: colWidth - 2,
            height: rowHeight - 2,
            color: rgb(input.primary.r * 0.15, input.primary.g * 0.15, input.primary.b * 0.15),
          })
        }
        const wrapped = this.textRenderer.wrapPdfTextLine(
          cellText,
          input.embeddedFonts,
          cellFontSize,
          colWidth - 8,
          isHeader ? 'bold' : 'regular',
        )
        const cellRgb = isHeader ? input.accent : rowColor
        this.textRenderer.drawPdfVisualLine(
          input.page,
          wrapped[0] ?? '',
          cellX + 4,
          y - cellFontSize,
          cellFontSize,
          cellRgb,
          input.embeddedFonts,
          isHeader ? 'bold' : 'regular',
        )
      }
      input.page.drawLine({
        start: { x: input.input.padding, y: y - rowHeight + 4 },
        end: { x: input.dimensions.width - input.input.padding, y: y - rowHeight + 4 },
        thickness: 0.3,
        color: rgb(input.mutedColor.r, input.mutedColor.g, input.mutedColor.b),
      })
      y -= rowHeight
      isHeader = false
    }
    return y - 10
  }
}
