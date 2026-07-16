import { describe, expect, it } from 'vitest'
import { stripLegacySpacesConversationTitle } from './conversation-title'

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
