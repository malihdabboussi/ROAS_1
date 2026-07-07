import { Injectable } from '@nestjs/common'

export interface GeminiImageAnalysisInput {
  apiKey: string
  model: string
  mimeType: string
  buffer: Buffer
  prompt: string
}

@Injectable()
export class ArtifactMissionsMediaGeminiClient {
  async extractDocumentText(input: {
    apiKey: string
    buffer: Buffer
    mimeType: string
    filename?: string
  }): Promise<string> {
    if (!input.apiKey) return ''
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${input.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Extract all readable text from this document.\nReturn plain UTF-8 text only.\nDo not summarize.\nFile: ${input.filename ?? 'document'}`,
                },
                {
                  inline_data: {
                    mime_type: input.mimeType,
                    data: input.buffer.toString('base64'),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 32000,
          },
        }),
      },
    )
    if (!response.ok) return ''
    return this.extractGeminiText(await response.json())
  }

  async createQueryEmbedding(input: {
    apiKey: string
    query: string
    dimensions: number
  }): Promise<number[] | null> {
    if (!input.apiKey) return null
    const cleaned = input.query.trim()
    if (!cleaned) return null
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${input.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: cleaned.slice(0, 4000) }] },
            outputDimensionality: input.dimensions,
            taskType: 'RETRIEVAL_QUERY',
          }),
        },
      )
      if (!response.ok) return null
      const payload = (await response.json()) as { embedding?: { values?: number[] } }
      const vector = payload.embedding?.values
      return Array.isArray(vector) && vector.length === input.dimensions ? vector : null
    } catch {
      return null
    }
  }

  async analyzeImage(
    input: GeminiImageAnalysisInput,
  ): Promise<{ success: true; text: string } | { success: false; error?: string }> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: input.prompt.slice(0, 4000) },
                {
                  inline_data: {
                    mime_type: input.mimeType,
                    data: input.buffer.toString('base64'),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      },
    )
    if (!response.ok) return { success: false, error: 'Image analysis failed' }

    const text = this.extractGeminiText(await response.json())
    return text ? { success: true, text } : { success: false, error: 'Image analysis was empty' }
  }

  private extractGeminiText(payload: unknown): string {
    const data = payload as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
        .join('\n')
        .trim() ?? ''
    )
  }
}
