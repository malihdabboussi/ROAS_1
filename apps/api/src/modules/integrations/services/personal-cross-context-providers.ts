/**
 * Personal-account integrations (`user_integrations.org_id IS NULL`) that remain
 * usable by the owning user inside an organization workspace.
 *
 * Teammates never receive these rows — merge always filters `user_id === caller`.
 * Explicit Share with org (`scope_mode = org_shared`) is a separate action.
 *
 * Slack is intentionally omitted here: status must not treat personal Slack as
 * org-connected. Overview may still project it via OVERVIEW_EXTRA.
 */
export const PERSONAL_CROSS_CONTEXT_PROVIDERS = new Set([
  'fathom',
  'fireflies',
  'read_ai',
  'page_grader',
  'openai_codex',
  'anthropic_claude',
  'google_calendar',
  'outlook',
])

/** Overview-only extras (Manage UI). Not used by status/calendar resolution. */
export const PERSONAL_CROSS_CONTEXT_OVERVIEW_EXTRA = new Set(['slack'])

export function isPersonalCrossContextProvider(integrationId: string): boolean {
  return PERSONAL_CROSS_CONTEXT_PROVIDERS.has(integrationId)
}

export function personalCrossContextOverviewIds(): string[] {
  return [...PERSONAL_CROSS_CONTEXT_PROVIDERS, ...PERSONAL_CROSS_CONTEXT_OVERVIEW_EXTRA]
}
