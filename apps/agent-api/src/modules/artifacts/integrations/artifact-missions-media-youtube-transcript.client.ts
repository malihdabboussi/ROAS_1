import { Injectable } from '@nestjs/common'
import { YouTubeTranscriptApi } from 'youtube-transcript-api-js'

@Injectable()
export class ArtifactMissionsMediaYoutubeTranscriptClient {
  async fetchNativeTranscript(
    videoId: string,
    lang: string,
  ): Promise<{
    transcript: string
    segments: Array<{ start: number; end: number; text: string }>
  } | null> {
    try {
      const api = new YouTubeTranscriptApi()
      const fetched = await api.fetch(videoId, [lang, 'en'])
      if (!fetched?.snippets?.length) return null

      const segments = fetched.snippets.map(
        (snippet: { text: string; offset?: number; duration?: number }) => ({
          start: Number(((snippet.offset ?? 0) / 1000).toFixed(3)),
          end: Number((((snippet.offset ?? 0) + (snippet.duration ?? 0)) / 1000).toFixed(3)),
          text: snippet.text,
        }),
      )
      const transcript = fetched.snippets.map((snippet: { text: string }) => snippet.text).join(' ')
      return { transcript, segments }
    } catch {
      return null
    }
  }
}
