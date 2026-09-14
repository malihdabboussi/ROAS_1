import { describe, expect, it } from 'vitest'
import {
  isPersonalCrossContextProvider,
  PERSONAL_CROSS_CONTEXT_PROVIDERS,
  personalCrossContextOverviewIds,
} from '../personal-cross-context-providers'

describe('personal-cross-context-providers', () => {
  it('includes calendar providers so Agenda can use personal-account connections in org', () => {
    expect(PERSONAL_CROSS_CONTEXT_PROVIDERS.has('google_calendar')).toBe(true)
    expect(PERSONAL_CROSS_CONTEXT_PROVIDERS.has('outlook')).toBe(true)
    expect(isPersonalCrossContextProvider('google_calendar')).toBe(true)
  })

  it('keeps existing personal-only tools and excludes Slack from the status/calendar set', () => {
    for (const id of [
      'fathom',
      'fireflies',
      'read_ai',
      'page_grader',
      'openai_codex',
      'anthropic_claude',
    ]) {
      expect(PERSONAL_CROSS_CONTEXT_PROVIDERS.has(id)).toBe(true)
    }
    expect(PERSONAL_CROSS_CONTEXT_PROVIDERS.has('slack')).toBe(false)
    expect(personalCrossContextOverviewIds()).toContain('slack')
  })
})
