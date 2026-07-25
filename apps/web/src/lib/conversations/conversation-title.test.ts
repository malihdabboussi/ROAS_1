import { describe, expect, it } from 'vitest'
import {
  isPlaceholderConversationTitle,
  needsGeneratedConversationTitle,
  resolveSuggestedConversationTitle,
  stripLegacySpacesConversationTitle,
  titleFromFirstUserMessage,
} from './conversation-title'

describe('stripLegacySpacesConversationTitle', () => {
  it('hides legacy default conversation titles', () => {
    expect(stripLegacySpacesConversationTitle('Chat with ROAS')).toBe('')
    expect(stripLegacySpacesConversationTitle(' New conversation ')).toBe('')
    expect(stripLegacySpacesConversationTitle('team conversation')).toBe('')
    expect(stripLegacySpacesConversationTitle('Slack Chat')).toBe('')
  })

  it('keeps user-authored titles', () => {
    expect(stripLegacySpacesConversationTitle('Launch plan')).toBe('Launch plan')
  })
})

describe('titleFromFirstUserMessage', () => {
  it('collapses whitespace, strips Slack chrome, and truncates at a word boundary', () => {
    expect(titleFromFirstUserMessage('  hello   world  ', 11)).toBe('hello world')
    expect(
      titleFromFirstUserMessage(
        'Can you check the <#C0B6E0K3ABC|budget> channel for the Q3 plan please?',
        36,
      ),
    ).toBe('Can you check the budget channel')
  })

  it('returns empty for blank input', () => {
    expect(titleFromFirstUserMessage('   ')).toBe('')
  })
})

describe('resolveSuggestedConversationTitle', () => {
  it('prefers a real model title', () => {
    expect(resolveSuggestedConversationTitle('Ops Desk check-in', 'long message')).toBe(
      'Ops Desk check-in',
    )
  })

  it('falls back to the first message when suggestion is empty or placeholder', () => {
    expect(resolveSuggestedConversationTitle('', 'Start our check-in now')).toBe(
      'Start our check-in now',
    )
    expect(resolveSuggestedConversationTitle('New conversation', 'Start our check-in now')).toBe(
      'Start our check-in now',
    )
  })
})

describe('isPlaceholderConversationTitle', () => {
  it('treats null and legacy defaults as placeholders', () => {
    expect(isPlaceholderConversationTitle(null)).toBe(true)
    expect(isPlaceholderConversationTitle('New Conversation')).toBe(true)
    expect(isPlaceholderConversationTitle('Slack Chat')).toBe(true)
    expect(isPlaceholderConversationTitle('Real title')).toBe(false)
  })
})

describe('needsGeneratedConversationTitle', () => {
  it('flags raw first-message dumps and Slack leakage', () => {
    expect(needsGeneratedConversationTitle('hi')).toBe(true)
    expect(needsGeneratedConversationTitle('All right so if it was double or not...')).toBe(true)
    expect(needsGeneratedConversationTitle('Can you check the <#C0B6E0K3ABC|budget> please')).toBe(
      true,
    )
    expect(needsGeneratedConversationTitle('Budget approval')).toBe(false)
  })
})
