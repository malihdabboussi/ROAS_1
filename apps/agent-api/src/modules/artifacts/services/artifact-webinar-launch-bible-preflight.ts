import type { ActionPreflightCoverage, ActionPreflightFailure } from './artifact-action-preflight'

type WebinarLaunchBibleAction = 'compile_webinar_launch_bible'

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

const CLIENT_FACING_COPY_TABS = new Set([
  '2B - Webinar Content',
  'P1 - Opt-in Page',
  'P2 - Confirmation Page',
  'P3 - Offer Page',
  'P4 - Replay Page',
  '4 - Ad Scripts',
  '5 - Meta Ad Copy',
  '6 - Thank You Page Videos',
  '7 - SMS & Emails',
])

export const WEBINAR_LAUNCH_BIBLE_PREFLIGHT_OVERRIDES: Record<
  WebinarLaunchBibleAction,
  ActionPreflightCoverage
> = {
  compile_webinar_launch_bible: {
    mode: 'static_preflight',
    reason:
      'Launch Bible tab payloads require the complete ordered section set and valid parent references.',
  },
}

export const WEBINAR_LAUNCH_BIBLE_PREFLIGHTS = {
  compile_webinar_launch_bible: validateWebinarLaunchBiblePreflight,
}

function validateWebinarLaunchBiblePreflight(
  data: Record<string, unknown>,
): ActionPreflightFailure | null {
  const rows = Array.isArray(data.tabs)
    ? data.tabs.filter(
        (tab): tab is Record<string, unknown> =>
          Boolean(tab) && typeof tab === 'object' && !Array.isArray(tab),
      )
    : []
  const titles = rows.map((tab) => stringValue(tab.title)).filter(Boolean) as string[]
  const missing = REQUIRED_TABS.filter((title) => !titles.includes(title))
  if (missing.length > 0) {
    return failure(
      `Launch Bible is missing required tabs: ${missing.join(', ')}`,
      'WEBINAR_LAUNCH_BIBLE_TABS_MISSING',
    )
  }
  if (new Set(titles).size !== titles.length) {
    return failure('Launch Bible tab titles must be unique', 'WEBINAR_LAUNCH_BIBLE_TABS_DUPLICATE')
  }
  if (
    titles.length !== REQUIRED_TABS.length ||
    REQUIRED_TABS.some((title, index) => titles[index] !== title)
  ) {
    return failure(
      `Launch Bible tabs must use the required order: ${REQUIRED_TABS.join(', ')}`,
      'WEBINAR_LAUNCH_BIBLE_TAB_ORDER_INVALID',
    )
  }
  for (const row of rows) {
    const title = stringValue(row.title)
    const html = stringValue(row.html)
    if (!title || !html) {
      return failure(
        'Every Launch Bible tab requires non-empty title and html fields',
        'WEBINAR_LAUNCH_BIBLE_TAB_INVALID',
      )
    }
    const parentTitle = stringValue(row.parent_title)
    if (parentTitle && !titles.includes(parentTitle)) {
      return failure(
        `Launch Bible parent tab not found: ${parentTitle}`,
        'WEBINAR_LAUNCH_BIBLE_PARENT_MISSING',
      )
    }
  }
  const funnelChildren = rows.filter((row) => String(row.title ?? '').match(/^P[1-4] - /))
  if (funnelChildren.some((row) => row.parent_title !== '3 - Funnel Pages')) {
    return failure(
      'P1-P4 Launch Bible tabs must use parent_title "3 - Funnel Pages"',
      'WEBINAR_LAUNCH_BIBLE_PARENT_INVALID',
    )
  }
  const replayPage = rows.find((row) => row.title === 'P4 - Replay Page')
  const replayPageHtml = stringValue(replayPage?.html)?.toLowerCase() ?? ''
  if (
    /post-webinar sequence|email\s+\d+\s+of\s+\d+|send timing:|subject line(?:\s|\()/i.test(
      replayPageHtml,
    )
  ) {
    return failure(
      'P4 - Replay Page may contain only on-page replay landing-page copy. Move replay delivery, post-webinar email/SMS, and replay-plus-offer follow-up into 7 - SMS & Emails.',
      'WEBINAR_LAUNCH_BIBLE_REPLAY_MESSAGES_MISPLACED',
    )
  }
  const tabsWithEmDashes = rows
    .filter((row) => CLIENT_FACING_COPY_TABS.has(String(row.title ?? '')))
    .filter((row) => String(row.html ?? '').includes('—'))
    .map((row) => String(row.title))
  if (tabsWithEmDashes.length > 0) {
    return failure(
      `Dylan Super Voice validation failed. Remove every em dash from client-facing copy and rerun the owning copy skill before compiling these tabs: ${tabsWithEmDashes.join(', ')}`,
      'WEBINAR_LAUNCH_BIBLE_SUPER_VOICE_INVALID',
    )
  }
  return null
}

function failure(error: string, errorCode: string): ActionPreflightFailure {
  return { error, errorCode }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}
