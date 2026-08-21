import { describe, expect, it } from 'vitest'
import {
  CONVERSATION_HISTORY_SECTION_INCREMENT,
  CONVERSATION_HISTORY_SECTION_INITIAL,
  conversationHistoryRowShowsSubtitle,
  conversationHistorySectionCap,
  conversationHistoryShowMoreVisibleRows,
} from './conversation-history-section-cap'

describe('conversation history section cap', () => {
  it('shows every client-folder row instead of a More cap', () => {
    expect(
      conversationHistorySectionCap({
        groupBy: 'client',
        splitPinned: false,
        visibleRows: {},
        sectionId: 'above-it',
        total: 12,
      }),
    ).toBe(12)
  })

  it('keeps dated subtitles in client folders and Recents', () => {
    expect(conversationHistoryRowShowsSubtitle('above-it', 'client')).toBe(true)
    expect(conversationHistoryRowShowsSubtitle('recents', 'none')).toBe(true)
    expect(conversationHistoryRowShowsSubtitle('camp-1', 'campaign')).toBe(false)
  })

  it('grows a capped section by the increment', () => {
    expect(conversationHistoryShowMoreVisibleRows({}, 'today')).toEqual({
      today: CONVERSATION_HISTORY_SECTION_INITIAL + CONVERSATION_HISTORY_SECTION_INCREMENT,
    })
  })
})
