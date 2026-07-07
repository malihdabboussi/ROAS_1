import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { YouTubeTranscriptApi } from 'youtube-transcript-api-js'
import { GeminiOcrBillingContext, GeminiOcrService } from './gemini-ocr.service'

interface ExtractedLinkContent {
  title: string
  text: string
  sourceType: string
}

@Injectable()
export class LinkExtractionService {
  private readonly logger = new Logger(LinkExtractionService.name)

  constructor(private readonly geminiOcr: GeminiOcrService) {}

  async extract(url: string, billing?: GeminiOcrBillingContext): Promise<ExtractedLinkContent> {
    const normalizedUrl = this.normalizeUrl(url)
    const videoId = this.extractYouTubeVideoId(normalizedUrl)
    if (videoId) {
      return this.extractYouTubeTranscript(normalizedUrl, videoId, billing)
    }
    return this.extractWebPage(normalizedUrl, billing)
  }

  private extractYouTubeVideoId(url: string): string | null {
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.replace(/^www\./, '')
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v')
        const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/)
        if (shortsMatch) return shortsMatch[1]
        return null
      }
      if (host === 'youtu.be') {
        const id = parsed.pathname.slice(1).split('/')[0]
        return id?.length === 11 ? id : null
      }
      return null
    } catch {
      return null
    }
  }

  private async extractYouTubeTranscript(
    url: string,
    videoId: string,
    billing?: GeminiOcrBillingContext,
  ): Promise<ExtractedLinkContent> {
    let title = videoId
    try {
      const pageRes = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'VibeyBrainBot/1.0' },
        signal: AbortSignal.timeout(10_000),
      })
      if (pageRes.ok) {
        const html = await pageRes.text()
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
        if (titleMatch?.[1]) {
          title = this.cleanText(titleMatch[1]).replace(/\s*-\s*YouTube$/i, '')
        }
      }
    } catch {
      this.logger.warn(`Could not fetch YouTube page title for ${videoId}`)
    }

    let transcriptText: string | null = null
    const api = new YouTubeTranscriptApi()
    for (const langs of [['en'], []]) {
      try {
        const fetched =
          langs.length > 0 ? await api.fetch(videoId, langs) : await api.fetch(videoId)
        if (fetched?.snippets?.length) {
          transcriptText = fetched.snippets.map((s: { text: string }) => s.text).join(' ')
          break
        }
      } catch {
        /* try next */
      }
    }

    if (transcriptText) {
      const cleaned = this.cleanTranscriptText(transcriptText)
      if (cleaned) {
        return { title, text: cleaned, sourceType: 'transcript' }
      }
    }

    this.logger.warn(
      `YouTube transcript unavailable for ${videoId}, falling back to page extraction`,
    )
    return this.extractWebPage(url, billing)
  }

  private normalizeUrl(raw: string): string {
    if (!raw?.trim()) throw new BadRequestException('url is required')
    let value = raw.trim()
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`
    let parsed: URL
    try {
      parsed = new URL(value)
    } catch {
      throw new BadRequestException('Invalid URL')
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Only http/https URLs are supported')
    }
    return parsed.toString()
  }

  private async extractWebPage(
    url: string,
    billing?: GeminiOcrBillingContext,
  ): Promise<ExtractedLinkContent> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'VibeyBrainBot/1.0',
      },
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) {
      throw new BadRequestException(`Failed to fetch URL (${response.status})`)
    }
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (contentType.startsWith('image/')) {
      const bytes = Buffer.from(await response.arrayBuffer())
      const text = await this.geminiOcr.extractTextFromImage(bytes, contentType, url, billing)
      if (!text) throw new BadRequestException('No extractable text found at URL')
      return {
        title: this.resolveImageUrlTitle(url),
        text: this.cleanTranscriptText(text),
        sourceType: 'website',
      }
    }
    const html = await response.text()
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = this.cleanText(titleMatch?.[1] ?? '') || new URL(url).hostname
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
    const text = this.cleanText(stripped)
    if (!text) throw new BadRequestException('No extractable text found at URL')
    return { title, text, sourceType: 'website' }
  }

  private cleanText(value: string): string {
    return value.replace(/\s+/g, ' ').trim()
  }

  private cleanTranscriptText(value: string): string {
    return value
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  private resolveImageUrlTitle(url: string): string {
    try {
      const parsed = new URL(url)
      const segment = parsed.pathname.split('/').filter(Boolean).pop()
      if (segment) {
        return decodeURIComponent(segment)
      }
      return parsed.hostname
    } catch {
      return 'Image'
    }
  }
}
