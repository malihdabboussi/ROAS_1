import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

let _pdfLib: typeof import('pdf-lib') | undefined

export function getPdfLib() {
  if (!_pdfLib) _pdfLib = require('pdf-lib')
  return _pdfLib!
}

let _fontkit: any

export function getFontkit() {
  if (!_fontkit) _fontkit = require('@pdf-lib/fontkit').default ?? require('@pdf-lib/fontkit')
  return _fontkit
}

type PdfFontBytes =
  | {
      mode: 'noto'
      latinRegular: Buffer
      latinBold: Buffer
      hebrewRegular: Buffer
      hebrewBold: Buffer
    }
  | { mode: 'ubuntu'; regular: Buffer; bold: Buffer }

let _fontBytesCache: { key: string; value: PdfFontBytes } | null = null

function resolvePdfFontsDir(): string {
  const fontCandidates = [
    join(process.cwd(), 'dist', 'fonts'),
    join(process.cwd(), 'docker', 'fonts'),
    join(process.cwd(), '..', '..', 'docker', 'fonts'),
  ]
  const fontsDir = fontCandidates.find((candidate) => existsSync(join(candidate, 'Ubuntu-R.ttf')))
  if (!fontsDir) {
    throw new Error(
      `PDF fonts not found. Tried: ${fontCandidates.join(', ')}. Expected at least Ubuntu-R.ttf (fallback).`,
    )
  }
  return fontsDir
}

export function loadPdfFontBytes(): PdfFontBytes {
  const fontsDir = resolvePdfFontsDir()
  const hasNoto =
    existsSync(join(fontsDir, 'NotoSans-Regular.ttf')) &&
    existsSync(join(fontsDir, 'NotoSans-Bold.ttf')) &&
    existsSync(join(fontsDir, 'NotoSansHebrew-Regular.ttf')) &&
    existsSync(join(fontsDir, 'NotoSansHebrew-Bold.ttf'))
  const cacheKey = `${fontsDir}|noto=${hasNoto}`
  if (_fontBytesCache?.key === cacheKey) return _fontBytesCache.value

  let value: PdfFontBytes
  if (hasNoto) {
    value = {
      mode: 'noto',
      latinRegular: readFileSync(join(fontsDir, 'NotoSans-Regular.ttf')),
      latinBold: readFileSync(join(fontsDir, 'NotoSans-Bold.ttf')),
      hebrewRegular: readFileSync(join(fontsDir, 'NotoSansHebrew-Regular.ttf')),
      hebrewBold: readFileSync(join(fontsDir, 'NotoSansHebrew-Bold.ttf')),
    }
  } else {
    value = {
      mode: 'ubuntu',
      regular: readFileSync(join(fontsDir, 'Ubuntu-R.ttf')),
      bold: readFileSync(join(fontsDir, 'Ubuntu-B.ttf')),
    }
  }
  _fontBytesCache = { key: cacheKey, value }
  return value
}
