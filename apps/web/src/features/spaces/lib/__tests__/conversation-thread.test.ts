import { describe, expect, it } from 'vitest'
import { mergeOlderMessages, olderCursor, type ThreadMessage } from '../conversation-thread'

function msg(id: string, at: string): ThreadMessage {
  return { id, role: 'user', content: id, created_at: at }
}

describe('conversation thread pagination', () => {
  it('olderCursor is the created_at of the oldest loaded message', () => {
    const messages = [msg('m2', '2026-06-01T10:00:00Z'), msg('m3', '2026-06-01T11:00:00Z')]
    expect(olderCursor(messages)).toBe('2026-06-01T10:00:00Z')
    expect(olderCursor([])).toBeNull()
  })

  it('prepends older messages without duplicating ids', () => {
    const existing = [msg('m3', '2026-06-01T11:00:00Z'), msg('m4', '2026-06-01T12:00:00Z')]
    const older = [
      msg('m1', '2026-06-01T09:00:00Z'),
      msg('m2', '2026-06-01T10:00:00Z'),
      msg('m3', '2026-06-01T11:00:00Z'),
    ]

    const merged = mergeOlderMessages(existing, older)
    expect(merged.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4'])
  })
})
