import { Injectable } from '@nestjs/common'
import type { PdfContentFormat, PdfLayout, PdfTheme } from './artifact-pdf-render.types'

@Injectable()
export class ArtifactPdfRenderNormalizerService {
  normalizePdfLayout(value: unknown): PdfLayout {
    return value === '16:9' ? '16:9' : 'A4'
  }

  normalizePdfContentFormat(value: unknown): PdfContentFormat {
    if (value === 'text' || value === 'html') return value
    return 'markdown'
  }

  detectHtmlContent(content: string, declaredFormat: PdfContentFormat): PdfContentFormat {
    if (declaredFormat !== 'markdown') return declaredFormat
    const trimmed = content.trimStart()
    if (/^<!doctype\s/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return 'html'
    const blockTags = ['<h1', '<h2', '<h3', '<p>', '<p ', '<div', '<table', '<ul', '<ol', '<body']
    const distinctHits = blockTags.filter((tag) => content.toLowerCase().includes(tag)).length
    if (distinctHits >= 1) return 'html'
    return declaredFormat
  }

  normalizePdfPadding(value: unknown, layout: PdfLayout): number {
    const defaultPadding = layout === '16:9' ? 40 : 48
    if (typeof value !== 'number' || !Number.isFinite(value)) return defaultPadding
    if (value < 16) return 16
    if (value > 96) return 96
    return Math.floor(value)
  }

  normalizePdfImageUrls(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    const urls = value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.startsWith('http://') || entry.startsWith('https://'))
    return [...new Set(urls)]
  }

  normalizePdfTheme(value: unknown): PdfTheme {
    const fallback = {
      primary: '#7C3AED',
      accent: '#A78BFA',
      text: '#111827',
      muted: '#6B7280',
      background: '#FFFFFF',
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
    const obj = value as Record<string, unknown>
    const pickHex = (key: string, defaultValue: string): string => {
      const raw = obj[key]
      if (typeof raw !== 'string') return defaultValue
      const trimmed = raw.trim()
      return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : defaultValue
    }
    return {
      primary: pickHex('primary', fallback.primary),
      accent: pickHex('accent', fallback.accent),
      text: pickHex('text', fallback.text),
      muted: pickHex('muted', fallback.muted),
      background: pickHex('background', fallback.background),
    }
  }

  normalizePdfFileName(fileNameInput: unknown, title: string): string {
    const safeBase = (
      typeof fileNameInput === 'string' && fileNameInput.trim().length > 0
        ? fileNameInput.trim()
        : title
    )
      .toLowerCase()
      .replace(/[^a-z0-9-_ ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    const finalBase = safeBase.length > 0 ? safeBase : `report-${Date.now()}`
    return finalBase.endsWith('.pdf') ? finalBase : `${finalBase}.pdf`
  }

  extractImageUrlsFromContent(content: string, format: PdfContentFormat): string[] {
    const urls = new Set<string>()
    const addUrl = (candidate: string) => {
      const value = candidate.trim()
      if (value.startsWith('http://') || value.startsWith('https://')) urls.add(value)
    }
    if (format === 'markdown' || format === 'text') {
      const markdownImages = [...content.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g)]
      for (const match of markdownImages) addUrl(match[1] ?? '')
    }
    if (format === 'html') {
      const htmlImages = [...content.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>/gi)]
      for (const match of htmlImages) addUrl(match[1] ?? '')
    }
    return [...urls]
  }
}
