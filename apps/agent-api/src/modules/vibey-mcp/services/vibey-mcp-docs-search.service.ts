import { BadRequestException, Injectable } from '@nestjs/common'

export interface VibeyDocsSearchInput {
  query: string
  match_count?: number
  min_similarity?: number
}

export interface VibeyDocsSearchCitation {
  slug: string
  title: string
  snippet: string
  chunk_index: number
  similarity: number
}

export interface VibeyDocsSearchResult {
  citations: VibeyDocsSearchCitation[]
}

@Injectable()
export class VibeyMcpDocsSearchService {
  async search(input: VibeyDocsSearchInput): Promise<VibeyDocsSearchResult> {
    const baseUrl = (process.env.VIBEY_DOCS_BASE_URL ?? 'http://localhost:3011').replace(/\/+$/, '')
    const response = await fetch(`${baseUrl}/api/docs-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: input.query,
        ...(input.match_count !== undefined ? { match_count: input.match_count } : {}),
        ...(input.min_similarity !== undefined ? { min_similarity: input.min_similarity } : {}),
      }),
    })
    const body = (await response.json().catch(() => null)) as {
      citations?: unknown
      error?: string
    } | null
    if (!response.ok) {
      throw new BadRequestException(body?.error ?? 'Vibey docs search failed')
    }
    return {
      citations: Array.isArray(body?.citations)
        ? (body.citations as VibeyDocsSearchCitation[])
        : [],
    }
  }
}
