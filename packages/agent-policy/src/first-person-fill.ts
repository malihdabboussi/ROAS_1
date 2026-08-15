export const FIRST_PERSON_FILL_USER_BRAIN_QUERY =
  'who I am, what I do, what I am building now, recent wins, milestones, stories I tell, opinions, beliefs, offers, plugs, bio, personal brand'

const FIRST_PERSON_FILL_RE =
  /(?:fill(?:ing)? (?:this|it|that)(?: out| in)?|fill(?:ing)? (?:out|in) (?:this|the form)|help (?:me )?(?:on this|with this)[\s\S]{0,80}fill|guest prep|speaker (?:bio|form)|(?:write|draft|complete) (?:this|it) (?:as me|in my voice|for me)|on my behalf|\bmy bio\b|from my brain|check (?:my |the )?(?:user )?brain|check .{0,30}\(me\).{0,30}brain)/i

export function isFirstPersonFillRequest(text: string): boolean {
  return FIRST_PERSON_FILL_RE.test(text)
}

export function resolveUserBrainSearchQuery(query: string | undefined): string | undefined {
  const trimmed = query?.trim()
  if (!trimmed) return trimmed
  return isFirstPersonFillRequest(trimmed) ? FIRST_PERSON_FILL_USER_BRAIN_QUERY : trimmed
}
