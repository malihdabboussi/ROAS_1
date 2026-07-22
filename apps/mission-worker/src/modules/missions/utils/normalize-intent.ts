const MAX_FIELD_LEN = 1000
const MAX_ECOLOGY_LEN = 4000

function coerceField(
  o: Record<string, unknown>,
  camel: string,
  snake?: string,
  maxLength = MAX_FIELD_LEN,
): string | undefined {
  const raw =
    typeof o[camel] === 'string'
      ? (o[camel] as string).trim()
      : snake && typeof o[snake] === 'string'
        ? (o[snake] as string).trim()
        : undefined
  return raw ? raw.slice(0, maxLength) : undefined
}

/**
 * Normalise an intent object for `IntentPacketSchema.partial()`.
 * Handles `end_state` → `endState`, strips empty strings, clamps length.
 * Returns `undefined` when no valid fields remain.
 */
export function normalizeIntentPartial(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const result: Record<string, string> = {}

  const why = coerceField(o, 'why')
  if (why) result.why = why
  const story = coerceField(o, 'story')
  if (story) result.story = story
  const sensory = coerceField(o, 'sensory')
  if (sensory) result.sensory = sensory
  const endState = coerceField(o, 'endState', 'end_state')
  if (endState) result.endState = endState
  const ecology = coerceField(o, 'ecology', undefined, MAX_ECOLOGY_LEN)
  if (ecology) result.ecology = ecology

  return Object.keys(result).length > 0 ? result : undefined
}

function defaultIntent(base: string): Record<string, string> {
  const text = (base || 'User directive').slice(0, 900)
  return { why: text, story: text, sensory: text, endState: text, ecology: text }
}

/**
 * Normalise an intent object for full `IntentPacketSchema`.
 * Missing / empty fields fall back to `fallbackText`.
 */
export function normalizeIntentFull(raw: unknown, fallbackText: string): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaultIntent(fallbackText)
  }
  const o = raw as Record<string, unknown>
  const d = defaultIntent(fallbackText)
  return {
    why: coerceField(o, 'why') || d.why,
    story: coerceField(o, 'story') || d.story,
    sensory: coerceField(o, 'sensory') || d.sensory,
    endState: coerceField(o, 'endState', 'end_state') || d.endState,
    ecology: coerceField(o, 'ecology', undefined, MAX_ECOLOGY_LEN) || d.ecology,
  }
}

/**
 * Normalise a raw plan-subtask object (from OpenClaw) for `PlanSubtaskSchema`.
 * Returns `null` when title or assignTo is missing.
 */
export function normalizePlanSubtask(
  raw: Record<string, unknown>,
  fallbackText: string,
  index: number,
): Record<string, unknown> | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const assignToRaw =
    (typeof raw.assignTo === 'string' && raw.assignTo) ||
    (typeof raw.assign_to === 'string' && raw.assign_to) ||
    ''
  const assignTo = assignToRaw.trim()
  if (!title || !assignTo) return null

  const dependsOn = Array.isArray(raw.dependsOn)
    ? raw.dependsOn.map(String)
    : Array.isArray(raw.depends_on)
      ? (raw.depends_on as unknown[]).map(String)
      : []

  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `directive-st-${index}-${Date.now()}`

  const outputContract =
    raw.outputContract &&
    typeof raw.outputContract === 'object' &&
    !Array.isArray(raw.outputContract)
      ? (raw.outputContract as Record<string, unknown>)
      : raw.output_contract &&
          typeof raw.output_contract === 'object' &&
          !Array.isArray(raw.output_contract)
        ? (raw.output_contract as Record<string, unknown>)
        : undefined
  const assertionKeys = Array.isArray(raw.assertionKeys)
    ? raw.assertionKeys.map(String).filter(Boolean)
    : Array.isArray(raw.assertion_keys)
      ? (raw.assertion_keys as unknown[]).map(String).filter(Boolean)
      : undefined
  const scheduledAt =
    typeof raw.scheduledAt === 'string'
      ? raw.scheduledAt
      : typeof raw.scheduled_at === 'string'
        ? raw.scheduled_at
        : raw.scheduledAt === null || raw.scheduled_at === null
          ? null
          : undefined

  return {
    id,
    title,
    assignTo,
    dependsOn,
    intent: normalizeIntentFull(raw.intent, fallbackText),
    ...(assertionKeys ? { assertionKeys } : {}),
    ...(scheduledAt !== undefined ? { scheduledAt } : {}),
    ...(outputContract ? { outputContract } : {}),
  }
}
