import { describe, expect, it } from 'vitest'
import {
  isPlaceholderConversationTitle,
  needsGeneratedConversationTitle,
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
  })

  it('prefers model titles and cleans Slack chrome in fallbacks', () => {
    expect(resolveSuggestedConversationTitle('Budget Check', 'long opener')).toBe('Budget Check')
    expect(titleFromFirstUserMessage('Can you check <#C123|finance> for me please?', 40)).toBe(
      'Can you check finance for me please?',
    )
  })
})
