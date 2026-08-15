import { describe, expect, it } from 'vitest'
import {
  buildSocialAnalysisTranscriptRoute,
  extractSocialAnalysisSegments,
  extractSocialAnalysisTranscriptText,
} from './artifact-missions-media-transcript-payload'

describe('extractSocialAnalysisTranscriptText', () => {
  it('reads YouTube Social Analysis transcript_only_text from the main API wrapper', () => {
    const text = extractSocialAnalysisTranscriptText({
      success: true,
      action: 'youtube_video_transcript',
      data: {
        transcript_only_text: 'All right, buckle up.',
        transcript: [{ text: 'All right,', startMs: 0, endMs: 800 }],
      },
    })
    expect(text).toBe('All right, buckle up.')
  })

  it('joins YouTube transcript segments when only the array is present', () => {
    const text = extractSocialAnalysisTranscriptText({
      data: {
        transcript: [
          { text: 'All right,', startMs: 0, endMs: 800 },
          { text: 'buckle up.', startMs: 800, endMs: 1600 },
        ],
      },
    })
    expect(text).toBe('All right, buckle up.')
  })

  it('joins Instagram transcripts arrays', () => {
    const text = extractSocialAnalysisTranscriptText({
      data: {
        transcripts: [{ text: 'Hook line.' }, { content: 'Body line.' }],
      },
    })
    expect(text).toBe('Hook line. Body line.')
  })
})

describe('buildSocialAnalysisTranscriptRoute', () => {
  it('builds the main API YouTube transcript route', () => {
    expect(
      buildSocialAnalysisTranscriptRoute(
        'youtube_video_transcript',
        'https://youtu.be/S8lXMGq7JnY',
      ),
    ).toEqual({
      method: 'GET',
      path: '/api/integrations/scrapecreators/youtube/video/transcript?url=https%3A%2F%2Fyoutu.be%2FS8lXMGq7JnY',
    })
  })

  it('builds the main API TikTok transcript route', () => {
    expect(
      buildSocialAnalysisTranscriptRoute(
        'tiktok_video_transcript',
        'https://www.tiktok.com/@x/video/1',
      ),
    ).toEqual({
      method: 'GET',
      path: '/api/integrations/scrapecreators/tiktok/video/transcript?url=https%3A%2F%2Fwww.tiktok.com%2F%40x%2Fvideo%2F1',
    })
  })
})

describe('extractSocialAnalysisSegments', () => {
  it('maps YouTube startMs/endMs into seconds', () => {
    expect(
      extractSocialAnalysisSegments({
        success: true,
        data: {
          transcript: [{ text: 'All right,', startMs: 800, endMs: 1600 }],
        },
      }),
    ).toEqual([{ start: 0.8, end: 1.6, text: 'All right,' }])
  })
})
