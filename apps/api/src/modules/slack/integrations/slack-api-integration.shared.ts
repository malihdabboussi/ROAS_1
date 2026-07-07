export const SLACK_API_BASE = 'https://slack.com/api'

const SLACK_AUTH_ERRORS = new Set([
  'invalid_auth',
  'token_revoked',
  'not_authed',
  'account_inactive',
])

export class SlackAuthError extends Error {
  constructor(readonly slackError: string) {
    super(slackError)
    this.name = 'SlackAuthError'
  }
}

export function isSlackAuthError(error: unknown): error is SlackAuthError {
  return error instanceof SlackAuthError
}

export function throwSlackError(error: string | undefined, fallback: string): never {
  const code = error ?? fallback
  if (SLACK_AUTH_ERRORS.has(code)) throw new SlackAuthError(code)
  throw new Error(code)
}
