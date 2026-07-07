import { Injectable } from '@nestjs/common'

@Injectable()
export class ArtifactMissionsMediaScrapeCreatorsClient {
  async fetchTranscriptBody(input: {
    url: string
    upstreamPath: string
    timeoutMs?: number
  }): Promise<unknown | null> {
    const apiKey = (process.env.SCRAPECREATORS_API_KEY ?? '').trim()
    if (!apiKey) return null

    const endpoint = new URL(`https://api.scrapecreators.com${input.upstreamPath}`)
    endpoint.searchParams.set('url', input.url)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 45_000)
    try {
      const response = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: { 'x-api-key': apiKey, Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) return null
      const text = await response.text()
      try {
        return text ? JSON.parse(text) : null
      } catch {
        return text
      }
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}
