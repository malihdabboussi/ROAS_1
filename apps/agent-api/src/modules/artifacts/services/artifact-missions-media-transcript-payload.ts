type TranscriptSegment = { start: number; end: number; text: string }

const SOCIAL_ANALYSIS_TRANSCRIPT_PATHS: Record<string, string> = {
  instagram_media_transcript: '/api/integrations/scrapecreators/instagram/media/transcript',
  tiktok_video_transcript: '/api/integrations/scrapecreators/tiktok/video/transcript',
  twitter_tweet_transcript: '/api/integrations/scrapecreators/twitter/tweet/transcript',
  facebook_post_transcript: '/api/integrations/scrapecreators/facebook/post/transcript',
  youtube_video_transcript: '/api/integrations/scrapecreators/youtube/video/transcript',
}

export function buildSocialAnalysisTranscriptRoute(actionSlug: string, url: string) {
  const base = SOCIAL_ANALYSIS_TRANSCRIPT_PATHS[actionSlug]
  if (!base) return null
  return { method: 'GET' as const, path: `${base}?${new URLSearchParams({ url }).toString()}` }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function payloadLayers(body: unknown): unknown[] {
  const layers: unknown[] = [body]
  const root = asRecord(body)
  if (root?.data !== undefined) layers.push(root.data)
  const nested = asRecord(root?.data)
  if (nested?.data !== undefined) layers.push(nested.data)
  if (root?.result !== undefined) layers.push(root.result)
  return layers
}

function joinSegmentTexts(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      const row = asRecord(item)
      const text = row?.text ?? row?.transcript ?? row?.content
      return typeof text === 'string' ? text.trim() : ''
    })
    .filter(Boolean)
    .join(' ')
    .trim()
}

export function extractSocialAnalysisTranscriptText(body: unknown): string {
  for (const layer of payloadLayers(body)) {
    if (typeof layer === 'string' && layer.trim()) return layer.trim()
    const record = asRecord(layer)
    if (!record) continue
    for (const key of ['transcript_only_text', 'text', 'caption', 'transcript']) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
    const fromArrays =
      joinSegmentTexts(record.transcripts) ||
      joinSegmentTexts(record.transcript) ||
      joinSegmentTexts(record.segments) ||
      joinSegmentTexts(record.utterances)
    if (fromArrays) return fromArrays
  }
  return ''
}

function toSeconds(primary: unknown, millis: unknown): number {
  if (millis !== undefined && millis !== null && String(millis).trim() !== '') {
    const ms = Number(millis)
    if (Number.isFinite(ms)) return Number((ms / 1000).toFixed(3))
  }
  const value = Number(primary)
  return Number.isFinite(value) ? value : 0
}

export function extractSocialAnalysisSegments(body: unknown): TranscriptSegment[] {
  for (const layer of payloadLayers(body)) {
    const record = asRecord(layer)
    if (!record) continue
    const raw = [record.segments, record.utterances, record.transcript].find((value) =>
      Array.isArray(value),
    )
    if (!Array.isArray(raw)) continue
    const mapped = raw
      .map((item) => {
        const row = asRecord(item)
        const text = typeof row?.text === 'string' ? row.text.trim() : ''
        if (!text) return null
        return {
          start: toSeconds(row?.start ?? row?.start_time ?? row?.startTime, row?.startMs),
          end: toSeconds(row?.end ?? row?.end_time ?? row?.endTime, row?.endMs),
          text,
        }
      })
      .filter((segment): segment is TranscriptSegment => segment !== null)
    if (mapped.length > 0) return mapped
  }
  return []
}
