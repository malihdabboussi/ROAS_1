import { describe, expect, it } from 'vitest'
import {
  isPlaceholderConversationTitle,
  resolveSuggestedConversationTitle,
  stripLegacySpacesConversationTitle,
  titleFromFirstUserMessage,
} from './conversation-title'

describe('stripLegacySpacesConversationTitle', () => {
  it('hides legacy default conversation titles', () => {
    expect(stripLegacySpacesConversationTitle('Chat with ROAS')).toBe('')
    expect(stripLegacySpacesConversationTitle(' New conversation ')).toBe('')
    expect(stripLegacySpacesConversationTitle('team conversation')).toBe('')
  })

  it('keeps user-authored titles', () => {
    expect(stripLegacySpacesConversationTitle('Launch plan')).toBe('Launch plan')
  })
})

describe('titleFromFirstUserMessage', () => {
  it('collapses whitespace and truncates', () => {
    expect(titleFromFirstUserMessage('  hello   world  ', 11)).toBe('hello world')
    expect(titleFromFirstUserMessage('abcdefghij', 5)).toBe('abcde')
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
    expect(isPlaceholderConversationTitle('Real title')).toBe(false)
  })
})
