import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { FirecrawlBrandingData } from '../types'

export interface BrandingScrapeResult {
  url: string
  branding?: FirecrawlBrandingData
  metadata?: Record<string, unknown>
  success: boolean
  error?: string
}

@Injectable()
export class FirecrawlIntegration {
  private readonly logger = new Logger(FirecrawlIntegration.name)
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.firecrawl.dev/v2'

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FIRECRAWL_API_KEY') || ''
    if (!this.apiKey) {
      this.logger.warn('FIRECRAWL_API_KEY not configured — website branding extraction disabled')
    }
  }

  async scrapeBranding(url: string, maxRetries = 3): Promise<BrandingScrapeResult> {
    if (!this.apiKey) {
      return { url, success: false, error: 'Firecrawl API key not configured' }
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/scrape`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, formats: ['branding'] }),
          signal: AbortSignal.timeout(60_000),
        })

        if (!response.ok) {
          const errorText = await response.text()
          if ((response.status >= 500 || response.status === 408) && attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 1000
            this.logger.log(`Firecrawl branding retry ${attempt}/${maxRetries} after ${delay}ms`)
            await new Promise((r) => setTimeout(r, delay))
            continue
          }
          throw new Error(
            `Firecrawl API error: ${response.status} ${response.statusText} - ${errorText}`,
          )
        }

        const data = await response.json()
        return { url, branding: data.data?.branding, metadata: data.data?.metadata, success: true }
      } catch (error) {
        const retryable =
          error instanceof Error &&
          (error.name === 'AbortError' ||
            error.message.includes('timeout') ||
            error.message.includes('network') ||
            error.message.includes('502') ||
            error.message.includes('503') ||
            error.message.includes('504'))

        if (retryable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000
          this.logger.log(`Firecrawl branding retry ${attempt}/${maxRetries} after ${delay}ms`)
          await new Promise((r) => setTimeout(r, delay))
          continue
        }

        return {
          url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    return { url, success: false, error: 'Max retries exceeded' }
  }
}
