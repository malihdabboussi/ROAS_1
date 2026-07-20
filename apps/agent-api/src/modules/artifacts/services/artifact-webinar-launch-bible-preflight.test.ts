import { describe, expect, it } from 'vitest'
import { validateWebinarLaunchBiblePreflight } from './artifact-webinar-launch-bible-preflight'

const REQUIRED_TABS = [
  '0 - Overview',
  '1 - ICP Sheet',
  '2A - Webinar Offer',
  '2B - Webinar Content',
  '3 - Funnel Pages',
  'P1 - Opt-in Page',
  'P2 - Confirmation Page',
  'P3 - Offer Page',
  'P4 - Replay Page',
  '4 - Ad Scripts',
  '5 - Meta Ad Copy',
  '6 - Thank You Page Videos',
  '7 - SMS & Emails',
] as const

function launchBibleTabs(adScriptsHtml: string) {
  return REQUIRED_TABS.map((title) => ({
    title,
    html: title === '4 - Ad Scripts' ? adScriptsHtml : `<h1>${title}</h1>`,
    ...(title.match(/^P[1-4] - /) ? { parent_title: '3 - Funnel Pages' } : {}),
  }))
}

describe('validateWebinarLaunchBiblePreflight video script rules', () => {
  it.each([
    '<h2>Overlays</h2><p>0:00-0:05: I used to cold call.</p>',
    '<h2>Overlays</h2><p>0:20–0:28: $240M in production.</p>',
    '<h2>Script 1</h2><p>HOOK (0-3s): Stop scrolling.</p>',
  ])('rejects timestamped video scripts and overlays', (html) => {
    expect(validateWebinarLaunchBiblePreflight({ tabs: launchBibleTabs(html) })).toMatchObject({
      errorCode: 'WEBINAR_LAUNCH_BIBLE_VIDEO_TIMECODES_INVALID',
      error: expect.stringContaining('roas-video-ad-scripts'),
    })
  })

  it('allows a factual webinar time that is not an editing timecode', () => {
    expect(
      validateWebinarLaunchBiblePreflight({
        tabs: launchBibleTabs(
          '<h2>Script 1</h2><p>Join us July 22 at 10:00 AM Pacific.</p><h2>Overlays</h2><p>Free live training</p>',
        ),
      }),
    ).toBeNull()
  })
})
