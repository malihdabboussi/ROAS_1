import type { FathomSourceAction, FathomTranscriptTurn } from '../providers/fathom-meeting-source'

/**
 * LLM judgment pass over raw Fathom action items. Fathom transcribes
 * conversational chatter ("monitor ads over the weekend") as tasks; this pass
 * keeps only real commitments, rewrites them as owner + deliverable +
 * absolute deadline, and marks already-done items — the structure the team
 * writes by hand. Raw items are always preserved upstream
 * (meeting_recordings.provider_action_items), and any failure falls back to
 * the unrefined list.
 */

export interface FathomActionRefinementItem {
  index: number
  keep: boolean
  title?: string
  assignee_name?: string
  completed?: boolean
  why?: string
}

export const FATHOM_ACTION_REFINEMENT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          keep: { type: 'boolean' },
          title: { type: 'string' },
          assignee_name: { type: 'string' },
          completed: { type: 'boolean' },
          why: { type: 'string' },
        },
        required: ['index', 'keep'],
      },
    },
  },
  required: ['items'],
} as const

const TRANSCRIPT_CHAR_CAP = 16_000
const MAX_ACTIONS = 30

export function buildFathomActionRefinementPrompt(input: {
  actions: readonly FathomSourceAction[]
  transcript: readonly FathomTranscriptTurn[]
  providerSummary: string | null
  meetingTitle: string | null
  meetingStart: string | null
}): string {
  const actionLines = input.actions
    .slice(0, MAX_ACTIONS)
    .map((action, index) => {
      const meta: string[] = []
      if (action.assigneeName) meta.push(`suggested assignee: ${action.assigneeName}`)
      if (action.completed) meta.push('marked completed')
      return `${index}. ${action.sourceText.trim()}${meta.length ? ` (${meta.join(', ')})` : ''}`
    })
    .join('\n')

  let transcriptText = ''
  for (const turn of input.transcript) {
    const line = `${turn.speakerName}: ${turn.text}\n`
    if (transcriptText.length + line.length > TRANSCRIPT_CHAR_CAP) break
    transcriptText += line
  }

  return [
    `Meeting: ${input.meetingTitle?.trim() || 'Untitled meeting'}`,
    input.meetingStart ? `Meeting date: ${input.meetingStart}` : '',
    input.providerSummary?.trim() ? `Summary:\n${input.providerSummary.trim()}` : '',
    transcriptText ? `Transcript:\n${transcriptText}` : '',
    `Raw action items (from the meeting notetaker):\n${actionLines}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const FATHOM_ACTION_REFINEMENT_SYSTEM_PROMPT = [
  'You refine raw meeting-notetaker action items into the action list a sharp chief of staff would publish. Judge each raw item against the transcript and summary.',
  '',
  'For every raw item, return {index, keep, title?, assignee_name?, completed?, why?}:',
  '- keep=false for conversational reassurance or routine narration that is not a discrete commitment ("I\'ll keep an eye on it", someone describing monitoring they already do as part of their job), duplicate phrasings of another kept item, agenda restatements, and vague intentions with no owner or deliverable.',
  '- keep=true for genuine commitments: someone owes a concrete deliverable or action. When in doubt, keep it — silently dropping a real commitment is worse than keeping a borderline one.',
  '- title: rewrite the kept item as one concise commitment line — verb + deliverable + recipient, ending with an absolute deadline ("by Thu Aug 14") ONLY when the transcript states or clearly implies one relative to the meeting date. Never invent dates, owners, amounts, or scope not grounded in the evidence. Keep names exactly as they appear among the participants.',
  '- assignee_name: the participant who owns it, only when the transcript makes ownership clear.',
  '- completed=true when the discussion shows the item was already done before the meeting ended.',
  '- why: one short grounded clause on why it matters (used as secondary context, keep under 90 characters).',
  'Return every raw index exactly once.',
].join('\n')

/** Merge parsed LLM output onto the raw actions. Malformed entries keep the raw item untouched. */
export function applyFathomActionRefinement(
  actions: readonly FathomSourceAction[],
  parsed: unknown,
): FathomSourceAction[] {
  const items = extractItems(parsed)
  if (!items) return [...actions]

  const byIndex = new Map<number, FathomActionRefinementItem>()
  for (const item of items) {
    if (typeof item.index === 'number' && Number.isInteger(item.index)) byIndex.set(item.index, item)
  }

  const refined: FathomSourceAction[] = []
  actions.forEach((action, index) => {
    const verdict = byIndex.get(index)
    if (!verdict) {
      // Model skipped it (or the list was truncated at MAX_ACTIONS) — keep raw.
      refined.push(action)
      return
    }
    if (verdict.keep === false) return
    const title = typeof verdict.title === 'string' ? verdict.title.trim() : ''
    const assignee =
      typeof verdict.assignee_name === 'string' ? verdict.assignee_name.trim() : ''
    refined.push({
      ...action,
      sourceText: title || action.sourceText,
      assigneeName: assignee || action.assigneeName,
      completed: action.completed || verdict.completed === true,
      refinement: {
        original_text: action.sourceText,
        ...(typeof verdict.why === 'string' && verdict.why.trim()
          ? { why: verdict.why.trim().slice(0, 200) }
          : {}),
      },
    })
  })
  return refined
}

function extractItems(parsed: unknown): FathomActionRefinementItem[] | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const items = (parsed as { items?: unknown }).items
  if (!Array.isArray(items)) return null
  return items.filter(
    (item): item is FathomActionRefinementItem => !!item && typeof item === 'object',
  )
}
