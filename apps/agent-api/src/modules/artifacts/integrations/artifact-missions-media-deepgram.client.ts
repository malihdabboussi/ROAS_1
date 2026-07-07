import { readFile } from 'node:fs/promises'
import { Injectable } from '@nestjs/common'

export type DeepgramTranscriptSegment = { start: number; end: number; text: string }

export interface DeepgramTranscriptionResult {
  transcript: string
  segments: DeepgramTranscriptSegment[]
}

export type DeepgramTranscriptionOptions = {
  language?: string
}

function normalizedLanguage(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

@Injectable()
export class ArtifactMissionsMediaDeepgramClient {
  async transcribeAudioFile(
    audioPath: string,
    options: DeepgramTranscriptionOptions = {},
  ): Promise<DeepgramTranscriptionResult> {
    const audioBuffer = await readFile(audioPath)
    return this.transcribeAudioBuffer(audioBuffer, options)
  }

  async transcribeAudioBuffer(
    audioBuffer: Buffer,
    options: DeepgramTranscriptionOptions = {},
  ): Promise<DeepgramTranscriptionResult> {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY ?? ''
    if (!deepgramApiKey) {
      throw new Error('DEEPGRAM_API_KEY is not configured')
    }
    const query = new URLSearchParams({
      model: 'nova-3',
      smart_format: 'true',
      punctuate: 'true',
      utterances: 'true',
    })
    const language = normalizedLanguage(options.language)
    if (language) query.set('language', language)

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?${query.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          'Content-Type': 'audio/mpeg',
        },
        body: new Uint8Array(audioBuffer),
      },
    )
    if (!response.ok) {
      throw new Error(`Deepgram transcription failed (${response.status})`)
    }

    const payload = (await response.json()) as {
      results?: {
        channels?: Array<{ alternatives?: Array<{ transcript?: string }> }>
        utterances?: Array<{ start?: number; end?: number; transcript?: string }>
      }
    }
    const transcript = payload.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
    const segments =
      payload.results?.utterances
        ?.filter((seg) => typeof seg.transcript === 'string' && seg.transcript.trim())
        .map((seg) => ({
          start: Number(seg.start ?? 0),
          end: Number(seg.end ?? 0),
          text: String(seg.transcript ?? '').trim(),
        })) ?? []
    return { transcript, segments }
  }
}
