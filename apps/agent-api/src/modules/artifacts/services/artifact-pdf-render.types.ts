import type { PDFFont } from 'pdf-lib'

export type PdfLayout = 'A4' | '16:9'
export type PdfContentFormat = 'markdown' | 'text' | 'html'
export type PdfTheme = {
  primary: string
  accent: string
  text: string
  muted: string
  background: string
}
export type PdfRgbColor = { r: number; g: number; b: number }
export type PdfBlock = {
  type: 'heading' | 'paragraph' | 'bullet' | 'divider' | 'table'
  text: string
  level?: number
  rows?: string[][]
}

export type PdfEmbeddedFonts =
  | {
      mode: 'noto'
      latin: PDFFont
      latinBold: PDFFont
      hebrew: PDFFont
      hebrewBold: PDFFont
    }
  | { mode: 'ubuntu'; latin: PDFFont; latinBold: PDFFont }
