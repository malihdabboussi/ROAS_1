import { describe, expect, it } from 'vitest'
import {
  getConversationDisplayTitle,
  isMeetingConversation,
  isPlaceholderConversationTitle,
  needsGeneratedConversationTitle,
  resolveGeneratedConversationTitle,
  resolveSuggestedConversationTitle,
  shouldReaffirmFirstMessageTitle,
  stripLegacySpacesConversationTitle,
  titleFromFirstUserMessage,
} from './conversation-title'

const meetingConversation = {
  title: 'Meeting — Client launch review',
  metadata: { context_type: 'meeting', meeting_item_id: 'meeting-1' },
}

describe('stripLegacySpacesConversationTitle', () => {
  it('hides legacy default conversation titles', () => {
    expect(stripLegacySpacesConversationTitle('Chat with Vibey')).toBe('')
    expect(stripLegacySpacesConversationTitle('Chat with ROAS')).toBe('')
    expect(stripLegacySpacesConversationTitle(' New conversation ')).toBe('')
    expect(stripLegacySpacesConversationTitle('team conversation')).toBe('')
    expect(stripLegacySpacesConversationTitle('Slack Chat')).toBe('')
  })

  it('keeps user-authored titles', () => {
    expect(stripLegacySpacesConversationTitle('Launch plan')).toBe('Launch plan')
  })
})

describe('meeting conversation titles', () => {
  it('identifies meeting threads from their canonical metadata', () => {
    expect(isMeetingConversation(meetingConversation)).toBe(true)
    expect(isMeetingConversation({ metadata: {} })).toBe(false)
  })

  it('hides the legacy Meeting prefix only for meeting threads', () => {
    expect(getConversationDisplayTitle(meetingConversation)).toBe('Client launch review')
    expect(
      getConversationDisplayTitle({ title: 'Meeting — Notes', metadata: { context_type: 'chat' } }),
    ).toBe('Meeting — Notes')
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

describe('resolveGeneratedConversationTitle', () => {
  it('returns only a model topic and never a first-message dump', () => {
    expect(resolveGeneratedConversationTitle('Ops Desk check-in')).toBe('Ops Desk check-in')
    expect(resolveGeneratedConversationTitle('')).toBe('')
    expect(resolveGeneratedConversationTitle('Slack Chat')).toBe('')
  })
})

describe('shouldReaffirmFirstMessageTitle', () => {
  it('preserves a curated title when the first turn finishes', () => {
    expect(shouldReaffirmFirstMessageTitle('Funnel Checkout Quality Review')).toBe(false)
    expect(
      shouldReaffirmFirstMessageTitle(
        'i updated the link can you QC the full funnel with a test user',
      ),
    ).toBe(true)
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
    expect(
      needsGeneratedConversationTitle(
        'Fix the slack agent responses',
        'Fix the slack agent responses',
      ),
    ).toBe(true)
  })
})
