import { describe, expect, it } from 'vitest'
import {
  isPlaceholderConversationTitle,
  needsGeneratedConversationTitle,
  pickGeneratedConversationTitle,
  resolveGeneratedConversationTitle,
  resolveSuggestedConversationTitle,
  titleFromFirstUserMessage,
} from './conversation-title.util'

describe('conversation-title.util', () => {
  it('treats Slack Chat as a placeholder', () => {
    expect(isPlaceholderConversationTitle('Slack Chat')).toBe(true)
  })

  it('flags raw message dumps for regeneration', () => {
    expect(needsGeneratedConversationTitle('hi')).toBe(true)
    expect(needsGeneratedConversationTitle('All right so if it was double or not')).toBe(true)
    expect(needsGeneratedConversationTitle('Budget Approval')).toBe(false)
    expect(
      needsGeneratedConversationTitle(
        'Fix the slack agent responses',
        'Fix the slack agent responses',
      ),
    ).toBe(true)
  })

  it('keeps Slack titles off first-message dumps when the model is empty', () => {
    expect(resolveGeneratedConversationTitle('')).toBe('')
    expect(resolveGeneratedConversationTitle('Slack Chat')).toBe('')
    expect(resolveGeneratedConversationTitle('Budget Check')).toBe('Budget Check')
  })

  it('does not fall back to the first Slack message when Gemini is empty', () => {
    expect(
      pickGeneratedConversationTitle({
        currentTitle: 'Slack Chat',
        firstMessage: 'Fix the slack agent responses',
        suggested: '',
        isSlack: true,
      }),
    ).toBeNull()
    expect(
      pickGeneratedConversationTitle({
        currentTitle: 'Slack Chat',
        firstMessage: 'Fix the slack agent responses',
        suggested: 'Slack agent quality',
        isSlack: true,
      }),
    ).toBe('Slack agent quality')
  })

  it('prefers model titles and cleans Slack chrome in fallbacks', () => {
    expect(resolveSuggestedConversationTitle('Budget Check', 'long opener')).toBe('Budget Check')
    expect(titleFromFirstUserMessage('Can you check <#C123|finance> for me please?', 40)).toBe(
      'Can you check finance for me please?',
    )
  })
})
