const OPERATIONAL_AGENDA_INTENT =
  /\b(?:open tasks?|my tasks?|tasks? assigned to me|assigned tasks?|meetings?|calendar|schedule|agenda|what should i (?:do|focus on)|what(?:'s| is) on top)\b/i
const CONVERSATIONAL_CONTEXT_INTENT =
  /\b(?:why|because|based on|recent calls?|call transcripts?|transcripts?|said|discussed|discussion|slack|brain|clients?|campaigns?|performance|ad stats?|notes?|takeaways?|context|recommended|recommendation|proposals?|concepts?)\b/i
// Questions about what happened in a meeting that already took place are
// answered from the Brain (transcript memories), never from the calendar.
const PAST_MEETING_RECALL_REQUEST =
  /\b(?:summar(?:y|ies|ize|ise|ized|ised)|recap|agreed?|agreement|decided|decisions?|outcomes?|action items?|follow[- ]ups?|happened|went|last|latest|previous|earlier|yesterday|demo(?:s|nstration)?|presentation)\b/i
const TASK_REQUEST =
  /\b(task|tasks|work|focus|priority|priorities|top)\b|\b(?:what|anything)\s+should\s+i\s+do\b/i
const CALENDAR_REQUEST = /\b(meeting|meetings|calendar|agenda|schedule)\b/i
const EXTENDED_CALENDAR_REQUEST =
  /\b(?:next|upcoming|coming up|few days|week|after today|starting tomorrow|from tomorrow|beginning tomorrow)\b/i
const AFTER_TODAY_CALENDAR_REQUEST =
  /\b(?:after today|starting tomorrow|from tomorrow|beginning tomorrow)\b/i
const TOMORROW_CALENDAR_REQUEST = /\btomorrow\b/i
const TASK_LOOKUP_CONTEXT =
  /\b(?:assign(?:ed|ment)?|source|origin|came from|come from|meeting|call|slack|transcript|provenance)\b/i
const POST_CALL_WORKFLOW_REQUEST =
  /\b(?:run|start|open|review) (?:the )?(?:post[- ]call|post[- ]meeting) (?:flow|review|follow[- ]up)\b/i
const QUOTED_TASK_TITLE = /[\u201c"]([^\u201d"]{3,240})[\u201d"]/u
const OPERATIONAL_PRIORITY_RECOMMENDATION =
  /\b(?:what should i do first|what should i start with(?: first)?|which (?:task|action|item) should i (?:do|start with|prioritize) first|what should i prioritize first|where should i start)\b/i
const DAILY_FOCUS_REQUEST =
  /\b(?:what should i (?:do|focus on)|what(?:'s| is) on top)(?:\s+for)?(?:\s+today)?\b/i

export function shouldSkipBrainContextForOperationalAgenda(content: string): boolean {
  const normalized = content.trim()
  if (extractCanonicalTaskLookupTitle(normalized)) return true
  if (!normalized || !OPERATIONAL_AGENDA_INTENT.test(normalized)) return false
  if (PAST_MEETING_RECALL_REQUEST.test(normalized)) return false
  return !CONVERSATIONAL_CONTEXT_INTENT.test(normalized)
}

export function extractCanonicalTaskLookupTitle(content: string): string | null {
  if (POST_CALL_WORKFLOW_REQUEST.test(content)) return null
  if (!TASK_LOOKUP_CONTEXT.test(content)) return null
  return content.match(QUOTED_TASK_TITLE)?.[1]?.trim() || null
}

export const isOperationalTaskRequest = (content: string): boolean => TASK_REQUEST.test(content)
export const isOperationalCalendarRequest = (content: string): boolean =>
  CALENDAR_REQUEST.test(content)
export const isOperationalDailyFocusRequest = (content: string): boolean =>
  DAILY_FOCUS_REQUEST.test(content)
export const isOperationalPriorityRecommendationRequest = (content: string): boolean =>
  OPERATIONAL_PRIORITY_RECOMMENDATION.test(content)
export const isExtendedCalendarRequest = (content: string): boolean =>
  EXTENDED_CALENDAR_REQUEST.test(content)

export function resolveOperationalCalendarWindow(
  content: string,
  now = new Date(),
): { start: string; end: string; label: string } {
  const isExtended = isExtendedCalendarRequest(content)
  const isTomorrow = TOMORROW_CALENDAR_REQUEST.test(content)
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  if (AFTER_TODAY_CALENDAR_REQUEST.test(content) || isTomorrow) {
    start.setUTCDate(start.getUTCDate() + 1)
  }
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + (isExtended ? 7 : 1))
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: isExtended
      ? 'Retrieving your upcoming meetings'
      : isTomorrow
        ? "Retrieving tomorrow's meetings"
        : "Retrieving today's meetings",
  }
}
