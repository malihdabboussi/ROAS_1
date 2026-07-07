import { Injectable } from '@nestjs/common'
import bidiFactory from 'bidi-js'
import type { PDFFont, PDFPage } from 'pdf-lib'
import { getPdfLib } from './artifact-pdf-render-support'
import type {
  PdfBlock,
  PdfContentFormat,
  PdfEmbeddedFonts,
  PdfRgbColor,
} from './artifact-pdf-render.types'

const bidi = bidiFactory()

function isHebrewScriptCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x0590 && codePoint <= 0x05ff) || (codePoint >= 0xfb1d && codePoint <= 0xfb4f)
  )
}

@Injectable()
export class ArtifactPdfRenderTextService {
  toStyledPdfBlocks(content: string, format: PdfContentFormat): PdfBlock[] {
    if (format === 'html') {
      return this.parseHtmlToBlocks(content)
    }
    const normalized = content.replace(/\r\n/g, '\n')
    if (format === 'text') {
      return normalized
        .split('\n\n')
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => ({ type: 'paragraph' as const, text: paragraph }))
    }

    const lines = normalized.split('\n')
    const blocks: PdfBlock[] = []
    let paragraphBuffer: string[] = []
    let tableBuffer: string[] = []

    const flushParagraph = () => {
      if (paragraphBuffer.length === 0) return
      for (const line of paragraphBuffer) {
        const merged = line.trim()
        if (merged.length > 0) {
          blocks.push({
            type: 'paragraph',
            text: this.stripHtmlTags(this.stripMarkdownInline(merged)),
          })
        }
      }
      paragraphBuffer = []
    }

    const flushTable = () => {
      if (tableBuffer.length === 0) return
      const rows: string[][] = []
      for (const row of tableBuffer) {
        if (/^\|[\s\-|:]+\|$/.test(row)) continue
        const cells = row
          .split('|')
          .slice(1, -1)
          .map((c) => this.stripMarkdownInline(c.trim()))
        if (cells.length > 0) rows.push(cells)
      }
      if (rows.length > 0) blocks.push({ type: 'table', text: '', rows })
      tableBuffer = []
    }

    for (const rawLine of lines) {
      const line = rawLine.trim()

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
        flushParagraph()
        flushTable()
        blocks.push({ type: 'divider', text: '' })
        continue
      }

      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
      if (headingMatch) {
        flushParagraph()
        flushTable()
        blocks.push({
          type: 'heading',
          level: headingMatch[1]?.length ?? 1,
          text: this.stripHtmlTags(this.stripMarkdownInline(headingMatch[2] ?? '')),
        })
        continue
      }

      if (/^\|.+\|$/.test(line)) {
        flushParagraph()
        tableBuffer.push(line)
        continue
      }

      if (tableBuffer.length > 0) {
        flushTable()
      }

      const bulletMatch = line.match(/^[-*+]\s+(.+)$/)
      if (bulletMatch) {
        flushParagraph()
        blocks.push({
          type: 'bullet',
          text: this.stripHtmlTags(this.stripMarkdownInline(bulletMatch[1] ?? '')),
        })
        continue
      }

      const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
      if (numberedMatch) {
        flushParagraph()
        blocks.push({
          type: 'bullet',
          text: this.stripHtmlTags(this.stripMarkdownInline(numberedMatch[1] ?? '')),
        })
        continue
      }

      if (/^!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/.test(line)) {
        flushParagraph()
        continue
      }

      if (!line) {
        flushParagraph()
        continue
      }

      paragraphBuffer.push(line)
    }
    flushParagraph()
    flushTable()
    return blocks
  }

  wrapPdfTextLine(
    logicalText: string,
    fonts: PdfEmbeddedFonts,
    fontSize: number,
    maxWidth: number,
    weight: 'regular' | 'bold',
  ): string[] {
    const clean = this.sanitizePdfTextForWinAnsi(logicalText)
      .replace(/\n+/g, ' ')
      .replace(/\t/g, '  ')
    if (fonts.mode === 'ubuntu') {
      const latin = weight === 'bold' ? fonts.latinBold : fonts.latin
      const visual = this.logicalLineToVisualForPdf(clean)
      return this.wrapPdfLine(visual, latin, fontSize, maxWidth)
    }
    const latin = weight === 'bold' ? fonts.latinBold : fonts.latin
    const hebrew = weight === 'bold' ? fonts.hebrewBold : fonts.hebrew
    const visual = this.logicalLineToVisualForPdf(clean)
    return this.wrapPdfLineMixed(visual, latin, hebrew, fontSize, maxWidth)
  }

  drawPdfVisualLine(
    page: PDFPage,
    line: string,
    x: number,
    y: number,
    fontSize: number,
    color: PdfRgbColor,
    fonts: PdfEmbeddedFonts,
    weight: 'regular' | 'bold',
  ): void {
    const latin = weight === 'bold' ? fonts.latinBold : fonts.latin
    if (fonts.mode === 'ubuntu') {
      page.drawText(line, {
        x,
        y,
        size: fontSize,
        font: latin,
        color: getPdfLib().rgb(color.r, color.g, color.b),
      })
      return
    }
    const hebrew = weight === 'bold' ? fonts.hebrewBold : fonts.hebrew
    this.drawMixedLeftToRight(page, line, x, y, fontSize, latin, hebrew, color)
  }

  drawPdfShapedLine(
    page: PDFPage,
    logicalText: string,
    x: number,
    y: number,
    fontSize: number,
    color: PdfRgbColor,
    fonts: PdfEmbeddedFonts,
    weight: 'regular' | 'bold',
  ): void {
    const safe = this.sanitizePdfTextForWinAnsi(logicalText)
    if (fonts.mode === 'ubuntu') {
      const latin = weight === 'bold' ? fonts.latinBold : fonts.latin
      const visual = this.logicalLineToVisualForPdf(safe)
      page.drawText(visual, {
        x,
        y,
        size: fontSize,
        font: latin,
        color: getPdfLib().rgb(color.r, color.g, color.b),
      })
      return
    }
    const visual = this.logicalLineToVisualForPdf(safe)
    this.drawPdfVisualLine(page, visual, x, y, fontSize, color, fonts, weight)
  }

  hexToRgbColor(hex: string): PdfRgbColor {
    const normalized = hex.replace('#', '')
    const r = parseInt(normalized.slice(0, 2), 16) / 255
    const g = parseInt(normalized.slice(2, 4), 16) / 255
    const b = parseInt(normalized.slice(4, 6), 16) / 255
    return { r, g, b }
  }

  sanitizePdfTextForWinAnsi(value: string): string {
    return this.stripHtmlTags(value)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
  }

  private logicalLineToVisualForPdf(line: string): string {
    if (!line.length) return line
    const embeddingLevels = bidi.getEmbeddingLevels(line, 'auto')
    return bidi.getReorderedString(line, embeddingLevels)
  }

  private splitScriptRuns(visualLine: string): Array<{ text: string; hebrew: boolean }> {
    const runs: Array<{ text: string; hebrew: boolean }> = []
    let buf = ''
    let mode: 'he' | 'lat' | null = null
    for (const ch of visualLine) {
      const cp = ch.codePointAt(0)!
      const he = isHebrewScriptCodePoint(cp)
      const m = he ? 'he' : 'lat'
      if (mode === null) {
        mode = m
        buf = ch
        continue
      }
      if (m !== mode) {
        runs.push({ text: buf, hebrew: mode === 'he' })
        buf = ch
        mode = m
      } else {
        buf += ch
      }
    }
    if (buf.length && mode !== null) runs.push({ text: buf, hebrew: mode === 'he' })
    return runs
  }

  private widthOfMixedLine(
    text: string,
    fontSize: number,
    latinFont: PDFFont,
    hebrewFont: PDFFont,
  ): number {
    let w = 0
    for (const run of this.splitScriptRuns(text)) {
      const f = run.hebrew ? hebrewFont : latinFont
      if (run.text.length === 0) continue
      w += f.widthOfTextAtSize(run.text, fontSize)
    }
    return w
  }

  private drawMixedLeftToRight(
    page: PDFPage,
    visualLine: string,
    x: number,
    y: number,
    fontSize: number,
    latinFont: PDFFont,
    hebrewFont: PDFFont,
    color: PdfRgbColor,
  ): void {
    let cursorX = x
    for (const run of this.splitScriptRuns(visualLine)) {
      if (!run.text.length) continue
      const f = run.hebrew ? hebrewFont : latinFont
      page.drawText(run.text, {
        x: cursorX,
        y,
        size: fontSize,
        font: f,
        color: getPdfLib().rgb(color.r, color.g, color.b),
      })
      cursorX += f.widthOfTextAtSize(run.text, fontSize)
    }
  }

  private wrapPdfLineMixed(
    visualLine: string,
    latinFont: PDFFont,
    hebrewFont: PDFFont,
    fontSize: number,
    maxWidth: number,
  ): string[] {
    const clean = visualLine.replace(/\t/g, '  ')
    if (clean.length === 0) return ['']
    const words = clean.split(' ')
    const wrapped: string[] = []
    let current = ''
    for (const word of words) {
      const candidate = current.length === 0 ? word : `${current} ${word}`
      if (this.widthOfMixedLine(candidate, fontSize, latinFont, hebrewFont) <= maxWidth) {
        current = candidate
        continue
      }
      if (current.length > 0) wrapped.push(current)
      current = word
    }
    if (current.length > 0) wrapped.push(current)
    return wrapped.length > 0 ? wrapped : ['']
  }

  private stripMarkdownInline(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .trim()
  }

  private stripHtmlTags(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#x27;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&hellip;/gi, '...')
      .replace(/&#x2019;/gi, "'")
      .replace(/&#x2014;/gi, '-')
      .replace(/&#[0-9]+;/g, ' ')
      .replace(/&[a-zA-Z]+;/g, ' ')
      .trim()
  }

  private parseHtmlToBlocks(html: string): PdfBlock[] {
    type Token = { pos: number; block: PdfBlock }
    const tokens: Token[] = []

    for (const m of html.matchAll(/<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const text = this.stripHtmlTags(m[2] ?? '').trim()
      if (text) {
        tokens.push({
          pos: m.index!,
          block: { type: 'heading', level: parseInt((m[1] ?? '1')[1] ?? '1'), text },
        })
      }
    }

    for (const listMatch of html.matchAll(/<[uo]l[^>]*>([\s\S]*?)<\/[uo]l>/gi)) {
      const listStart = listMatch.index!
      for (const liMatch of (listMatch[1] ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
        const text = this.stripHtmlTags(liMatch[1] ?? '').trim()
        if (text) tokens.push({ pos: listStart + liMatch.index!, block: { type: 'bullet', text } })
      }
    }

    for (const tableMatch of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)) {
      const rows: string[][] = []
      for (const rowMatch of (tableMatch[1] ?? '').matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells: string[] = []
        for (const cellMatch of (rowMatch[1] ?? '').matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
          cells.push(this.stripHtmlTags(cellMatch[1] ?? '').trim())
        }
        if (cells.length > 0) rows.push(cells)
      }
      if (rows.length > 0) {
        tokens.push({ pos: tableMatch.index!, block: { type: 'table', text: '', rows } })
      }
    }

    for (const m of html.matchAll(/<hr[^>]*\/?>/gi)) {
      tokens.push({ pos: m.index!, block: { type: 'divider', text: '' } })
    }

    const skipRanges: Array<[number, number]> = []
    for (const m of html.matchAll(
      /<[uo]l[^>]*>[\s\S]*?<\/[uo]l>|<table[^>]*>[\s\S]*?<\/table>/gi,
    )) {
      skipRanges.push([m.index!, m.index! + m[0].length])
    }
    const isInSkipRange = (pos: number) => skipRanges.some(([s, e]) => pos >= s && pos < e)

    for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      if (!isInSkipRange(m.index!)) {
        const text = this.stripHtmlTags(m[1] ?? '').trim()
        if (text) tokens.push({ pos: m.index!, block: { type: 'paragraph', text } })
      }
    }

    return tokens.sort((a, b) => a.pos - b.pos).map((t) => t.block)
  }

  private wrapPdfLine(
    line: string,
    font: { widthOfTextAtSize: (text: string, size: number) => number },
    fontSize: number,
    maxWidth: number,
  ): string[] {
    const clean = this.sanitizePdfTextForWinAnsi(line).replace(/\n+/g, ' ').replace(/\t/g, '  ')
    if (clean.length === 0) return ['']

    const words = clean.split(' ')
    const wrapped: string[] = []
    let current = ''
    for (const word of words) {
      const candidate = current.length === 0 ? word : `${current} ${word}`
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate
        continue
      }
      if (current.length > 0) wrapped.push(current)
      current = word
    }
    if (current.length > 0) wrapped.push(current)
    return wrapped
  }
}
