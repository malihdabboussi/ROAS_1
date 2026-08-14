/**
 * CEO Meetings title helpers — no "Meeting:" prefix; purpose-first labels.
 */

const PREFIX_RE = /^(?:fathom\s+)?meeting:\s*/i
const GENERIC_TITLE_RE =
  /^(impromptu(?:\s+zoom)?(?:\s+meeting|\s+call)?|untitled(?:\s+meeting)?|zoom meeting|working session(?:\s*[—-].*)?)$/i

export function stripMeetingTitlePrefix(title: string): string {
  return String(title ?? '')
    .replace(PREFIX_RE, '')
    .trim()
}

export const PROVISIONAL_FATHOM_MEETING_TITLE = 'Recorded call'

/** Provisional title while AI rename runs — never "Meeting:" / "Fathom meeting:". */
export function provisionalFathomMeetingTitle(rawTitle: string): string {
  const stripped = stripMeetingTitlePrefix(rawTitle)
  if (!stripped || GENERIC_TITLE_RE.test(stripped)) {
    return PROVISIONAL_FATHOM_MEETING_TITLE
  }
  return stripped.slice(0, 1000)
}

/**
 * Deterministic CEO label when AI naming is unavailable (gateway down, etc.).
 * Prefer Fathom "Meeting Purpose" from the summary; never leave the provisional forever.
 */
export function fallbackCeoMeetingTitle(input: {
  summary?: string | null
  calendarTitle?: string | null
  attendees?: Array<{ name?: string | null } | null> | null
}): string | null {
  const purpose = extractMeetingPurpose(String(input.summary ?? ''))
  if (purpose) {
    const sanitized = sanitizeCeoMeetingTitle(purpose)
    if (sanitized) return sanitized
    // Purpose lines are often short; pad with a stable role word so sanitize passes.
    const padded = sanitizeCeoMeetingTitle(`${purpose} review`)
    if (padded) return padded
  }

  const stripped = stripMeetingTitlePrefix(String(input.calendarTitle ?? ''))
  if (stripped && !GENERIC_TITLE_RE.test(stripped)) {
    return sanitizeCeoMeetingTitle(stripped) ?? stripped.slice(0, 120)
  }

  const names = (input.attendees ?? [])
    .map(
      (a) =>
        String(a?.name ?? '')
          .trim()
          .split(/\s+/)[0] ?? '',
    )
    .filter(Boolean)
  const unique = [...new Set(names)].slice(0, 2)
  if (unique.length >= 2) {
    return sanitizeCeoMeetingTitle(`${unique[0]} + ${unique[1]} working session`)
  }
  if (unique.length === 1) {
    return sanitizeCeoMeetingTitle(`${unique[0]} personal check-in`)
  }
  return 'Recorded call follow-up'
}

function extractMeetingPurpose(summary: string): string | null {
  if (!summary.trim()) return null
  const purposeMatch = summary.match(
    /Meeting Purpose\s*\n+([^\n]+(?:\n(?!Key Takeaways|Action Items|Next Steps)[^\n]+)*)/i,
  )
  if (purposeMatch?.[1]) {
    return purposeMatch[1].replace(/\s+/g, ' ').trim().slice(0, 120)
  }
  // First non-empty line that is not a section header.
  for (const line of summary.split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (/^(meeting purpose|key takeaways|action items|next steps|summary)\b/i.test(t)) continue
    return t.slice(0, 120)
  }
  return null
}

/** Normalize an AI / agent title before write. */
export function sanitizeCeoMeetingTitle(raw: string): string | null {
  let title = stripMeetingTitlePrefix(raw).replace(/\s+/g, ' ').trim()
  // Only strip wrapping quotes when both ends match.
  if (
    (title.startsWith('"') && title.endsWith('"')) ||
    (title.startsWith("'") && title.endsWith("'")) ||
    (title.startsWith('`') && title.endsWith('`'))
  ) {
    title = title.slice(1, -1).trim()
  }
  if (!title) return null
  // Drop trailing sentence punctuation; keep internal dashes/quotes.
  title = title.replace(/[.!?]+$/g, '').trim()
  if (!title || GENERIC_TITLE_RE.test(title)) return null
  if (title.length < 8 || title.length > 120) return null
  if (title.split(/\s+/).filter(Boolean).length < 3) return null
  // Reject model chatter / broken JSON fragments / non-titles.
  if (/[{}`*]|^here\b|json requested|"title"\s*:|@|\*summary\*/i.test(title)) return null
  return title.slice(0, 120)
}

export const CEO_MEETING_TITLE_RULES = [
  'Write a short CEO meeting label for Dylan’s Meetings list.',
  'Return JSON only: {"title":"..."} — no markdown fences or commentary.',
  'Rules for title:',
  '- 4–10 words, purpose-first (who + real operating purpose).',
  '- Never start with Meeting, Fathom, Impromptu, Untitled, or Zoom.',
  '- Do NOT copy sensational summary headings unless that was truly the purpose.',
  '  Bad: "Urgent: Stripe Compliance" when the call was a weekly client update.',
  '  Good: "Weekly client update — Stripe" or "Sales call — Jason attention".',
  '- Prefer conversation purpose over calendar scare titles or template section headers.',
  '- Use attendees/speakers + summary + transcript excerpt; invent nothing else.',
].join('\n')
