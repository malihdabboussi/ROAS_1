import { describe, expect, it } from 'vitest'
import { getSlashTokenBackspaceDeleteFrom } from './chat-input-slash-menu'

describe('getSlashTokenBackspaceDeleteFrom', () => {
  it('returns the slash token start when the caret follows a known command', () => {
    expect(getSlashTokenBackspaceDeleteFrom('/brief', '/brief'.length, ['brief'])).toBe(0)
    expect(getSlashTokenBackspaceDeleteFrom('run /brief ', 'run /brief '.length, ['brief'])).toBe(
      4,
    )
  })

  it('prefers the longest matching command key', () => {
    expect(
      getSlashTokenBackspaceDeleteFrom('run /brief-report', 'run /brief-report'.length, [
        'brief',
        'brief-report',
      ]),
    ).toBe(4)
  })

  it('ignores embedded or unknown slash text', () => {
    expect(getSlashTokenBackspaceDeleteFrom('run/bold', 'run/bold'.length, ['bold'])).toBeNull()
    expect(getSlashTokenBackspaceDeleteFrom('run /unknown', 'run /unknown'.length, ['bold'])).toBeNull()
  })
})
