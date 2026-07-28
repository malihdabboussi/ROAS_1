import { describe, expect, it } from 'vitest'
import { parseContent, stripEchoedMediaToolJson } from './chat-content-segments'

describe('stripEchoedMediaToolJson', () => {
  it('removes process_media toolResult JSON while keeping prose', () => {
    const input = `It rendered. Here's the real toolResult JSON, unedited:

{
  "success": true,
  "operation": "render_ig_story",
  "url": "https://cdn.example.com/story.mp4",
  "file_path": "/processed/story.mp4",
  "media_asset_id": "548941d2-dc17-4943-a0d2-37a66e263aa6",
  "format": "mp4",
  "duration_seconds": 10
}

**What shipped:**
- 1080×1920`

    expect(stripEchoedMediaToolJson(input)).toBe(
      `It rendered. Here's the real toolResult JSON, unedited:

**What shipped:**
- 1080×1920`,
    )
  })
})

describe('parseContent', () => {
  it('does not scrape mp4 urls out of echoed toolResult JSON', () => {
    const segments = parseContent(`Done.

{
  "success": true,
  "operation": "render_ig_story",
  "url": "https://cdn.example.com/story.mp4",
  "media_asset_id": "548941d2-dc17-4943-a0d2-37a66e263aa6",
  "format": "mp4"
}

Ready for review.`)

    expect(segments).toEqual([
      {
        type: 'text',
        value: `Done.

Ready for review.`,
      },
    ])
  })
})
