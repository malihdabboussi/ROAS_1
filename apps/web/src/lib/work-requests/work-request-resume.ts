/** Extract the public review token from a Service Request review URL. */
export function extractWorkRequestTokenFromUrl(reviewUrl: string): string | null {
  try {
    const url = new URL(reviewUrl, 'https://app.roas.io')
    const match = url.pathname.match(/\/request-review\/([^/]+)\/?$/)
    const token = match?.[1]?.trim() ?? ''
    return /^[A-Za-z0-9_-]{40,100}$/.test(token) ? token : null
  } catch {
    return null
  }
}

const REVIEW_URL_IN_TEXT_RE = /https?:\/\/[^\s)]+\/request-review\/[A-Za-z0-9_-]{40,100}/gi

/**
 * When Pixel only pasted a markdown review URL (no work_request UI block),
 * synthesize a resume card so users can finalize instead of looping the same link.
 */
export function synthesizeWorkRequestBlocksFromText(input: {
  content: string | null | undefined
  title?: string | null
  existingBlocks: ReadonlyArray<{ type?: string }>
}): Array<{
  type: 'work_request'
  id: string
  title: string
  reviewUrl: string
  status: 'pending'
}> {
  if (input.existingBlocks.some((block) => block.type === 'work_request')) return []
  const content = input.content?.trim() ?? ''
  if (!content) return []

  const seen = new Set<string>()
  const blocks: Array<{
    type: 'work_request'
    id: string
    title: string
    reviewUrl: string
    status: 'pending'
  }> = []

  for (const match of content.matchAll(REVIEW_URL_IN_TEXT_RE)) {
    const reviewUrl = match[0]?.replace(/[.,;:!?]+$/, '') ?? ''
    const token = extractWorkRequestTokenFromUrl(reviewUrl)
    if (!token || seen.has(token)) continue
    seen.add(token)
    blocks.push({
      type: 'work_request',
      id: `work-request-from-text-${token.slice(0, 12)}`,
      title: input.title?.trim() || 'Service Request ready',
      reviewUrl,
      status: 'pending',
    })
  }
  return blocks
}
