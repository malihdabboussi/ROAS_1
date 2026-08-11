export type SlackCadenceConfig = {
  enabled?: boolean
  weekdayEodStart?: number
  weekdayEodEnd?: number
  sundayStart?: number
  sundayEnd?: number
}

export type SlackCadenceDecision =
  | { allowed: true; reason: 'urgent' | 'weekday_eod' | 'weekend_high_bar' | 'sunday_check_in' }
  | { allowed: false; reason: 'cadence_deferred'; nextEligibleAt: string }

type LocalParts = { year: number; month: number; day: number; weekday: string; hour: number }

export function slackLocalParts(now: Date, timezone: string): LocalParts {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  )
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: String(values.weekday),
    hour: Number(values.hour),
  }
}

export function isSundayCheckInWindow(
  now: Date,
  timezone: string,
  config: SlackCadenceConfig = {},
): boolean {
  const local = slackLocalParts(now, timezone)
  return (
    local.weekday === 'Sun' &&
    local.hour >= (config.sundayStart ?? 17) &&
    local.hour < (config.sundayEnd ?? 19)
  )
}

export function decideSlackCadence(input: {
  now: Date
  timezone: string
  kind: string
  metadata: Record<string, unknown>
  config?: SlackCadenceConfig
}): SlackCadenceDecision {
  if (input.config?.enabled !== true) return { allowed: true, reason: 'weekday_eod' }
  if (input.kind === 'personal_moment') return { allowed: true, reason: 'urgent' }
  const config = input.config ?? {}
  const local = slackLocalParts(input.now, input.timezone)
  const weekend = local.weekday === 'Sat' || local.weekday === 'Sun'
  const confidence = Number(input.metadata.confidence ?? 0)
  const finding = String(input.metadata.signal_finding ?? '')
  const timeSensitive = /\b(urgent|today|tonight|before|by \d|deadline|blocked)\b/i.test(finding)
  const urgent =
    input.kind === 'client_risk' || (input.kind === 'unanswered_question' && timeSensitive)
  if (!weekend && urgent) return { allowed: true, reason: 'urgent' }
  if (weekend && urgent && confidence >= 0.9) return { allowed: true, reason: 'weekend_high_bar' }
  if (
    isSundayCheckInWindow(input.now, input.timezone, config) &&
    input.metadata.continuity_resurface === true
  ) {
    return { allowed: true, reason: 'sunday_check_in' }
  }
  if (
    !weekend &&
    local.hour >= (config.weekdayEodStart ?? 17) &&
    local.hour < (config.weekdayEodEnd ?? 18)
  ) {
    return { allowed: true, reason: 'weekday_eod' }
  }
  return {
    allowed: false,
    reason: 'cadence_deferred',
    nextEligibleAt: nextDeliveryWindow(input.now, input.timezone, config),
  }
}

function nextDeliveryWindow(now: Date, timezone: string, config: SlackCadenceConfig): string {
  const candidate = new Date(now.getTime() + 60 * 60_000)
  for (let index = 0; index < 8 * 24; index += 1) {
    const local = slackLocalParts(candidate, timezone)
    const weekdayWindow =
      local.weekday !== 'Sat' &&
      local.weekday !== 'Sun' &&
      local.hour === (config.weekdayEodStart ?? 17)
    const sundayWindow = local.weekday === 'Sun' && local.hour === (config.sundayStart ?? 17)
    if (weekdayWindow || sundayWindow) return candidate.toISOString()
    candidate.setTime(candidate.getTime() + 60 * 60_000)
  }
  return new Date(now.getTime() + 24 * 60 * 60_000).toISOString()
}
