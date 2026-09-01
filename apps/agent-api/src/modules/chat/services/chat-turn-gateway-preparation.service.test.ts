import { describe, expect, it } from 'vitest'
import {
  extractCanonicalTaskLookupTitle,
  isOperationalPriorityRecommendationRequest,
  shouldSkipBrainContextForOperationalAgenda,
} from './chat-operational-agenda.util'

describe('shouldSkipBrainContextForOperationalAgenda', () => {
  it.each([
    'What meetings do I have coming up?',
    'What should I focus on today, which open tasks are assigned to me, and what meetings are coming up?',
    "What's on top for today? Show only open tasks assigned to me, plus today's meetings.",
    'What about “Introduce Shannon to Adley for the Sphere Rockets golf event” — is that actually assigned to me, and what meeting or Slack message did it come from?',
  ])('skips retrieval for canonical task and calendar reads: %s', (content) => {
    expect(shouldSkipBrainContextForOperationalAgenda(content)).toBe(true)
  })

  it.each([
    'What should I focus on based on my recent calls?',
    'Why should I prioritize the FIFA vlog before the content shoots?',
    'What did we discuss in Slack about my open tasks?',
    'What is the status of the live client campaign?',
  ])('keeps retrieval when conversational context is part of the request: %s', (content) => {
    expect(shouldSkipBrainContextForOperationalAgenda(content)).toBe(false)
  })

  it('keeps retrieval for unrelated knowledge questions', () => {
    expect(
      shouldSkipBrainContextForOperationalAgenda('What positioning did Curtis recommend?'),
    ).toBe(false)
  })
})

describe('isOperationalPriorityRecommendationRequest', () => {
  it.each([
    'Given that schedule and task list, what should I do first before my next meeting?',
    'Which task should I prioritize first?',
    'What should I start with today?',
  ])('recognizes a request to choose the first action: %s', (content) => {
    expect(isOperationalPriorityRecommendationRequest(content)).toBe(true)
  })

  it.each([
    'What should I focus on today? Show my open tasks and meetings.',
    'What meetings do I have coming up?',
  ])('keeps inventory-only agenda requests deterministic: %s', (content) => {
    expect(isOperationalPriorityRecommendationRequest(content)).toBe(false)
  })
})

describe('extractCanonicalTaskLookupTitle', () => {
  it('does not intercept explicit post-call flow requests as task-source lookups', () => {
    expect(
      extractCanonicalTaskLookupTitle(
        'Run post-call flow for the completed meeting “Dwell Alliance webinar engine onboarding”.',
      ),
    ).toBeNull()
  })

  it('extracts a curly-quoted task title from an assignment and provenance follow-up', () => {
    expect(
      extractCanonicalTaskLookupTitle(
        'What about “Introduce Shannon to Adley for the Sphere Rockets golf event” — is that actually assigned to me, and what meeting or Slack message did it come from?',
      ),
    ).toBe('Introduce Shannon to Adley for the Sphere Rockets golf event')
  })

  it('does not intercept unrelated quoted knowledge questions', () => {
    expect(
      extractCanonicalTaskLookupTitle('What did Curtis mean by “tactical empathy”?'),
    ).toBeNull()
  })
})
