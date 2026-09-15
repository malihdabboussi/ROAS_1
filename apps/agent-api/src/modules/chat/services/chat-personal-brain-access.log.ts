import type { Logger } from '@nestjs/common'

type PolicyScope = { orgId: string | null; userId: string | null }

/**
 * A denied personal-brain read is invisible otherwise: the turn silently skips
 * the user's Brain lane and answers from company/customer scopes only. Log the
 * decision so a "Vibey can't see my memories" report is diagnosable from logs.
 */
export function logBrainDenied(logger: Pick<Logger, 'warn'>, agentId: string, scope: PolicyScope) {
  logger.warn(
    `personal brain access denied by policy for agent=${agentId} scope=${JSON.stringify(scope)}`,
  )
}

export function logPolicyMissing(logger: Pick<Logger, 'warn'>, agentId: string) {
  logger.warn(`agent policy service unavailable; personal brain access denied for agent=${agentId}`)
}
