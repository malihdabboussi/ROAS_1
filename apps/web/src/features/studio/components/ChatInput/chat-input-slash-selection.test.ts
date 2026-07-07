import { describe, expect, it } from 'vitest'
import {
  getSlashBackspaceTextUpdate,
  getSlashSelectionTextUpdate,
} from './chat-input-slash-selection'

describe('chat-input-slash-selection', () => {
  it('replaces the active slash token with the selected command key', () => {
    expect(getSlashSelectionTextUpdate('run /br now', 'run /br'.length, 'brief')).toEqual({
      nextText: 'run /brief  now',
      cursor: 'run /brief '.length,
    })
  })

  it('uses only the command insert when no slash token is active', () => {
    expect(getSlashSelectionTextUpdate('plain text', 'plain text'.length, 'brief')).toEqual({
      nextText: '/brief ',
      cursor: '/brief '.length,
    })
  })

  it('removes a known slash command when backspacing at its boundary', () => {
    expect(getSlashBackspaceTextUpdate('run /brief today', 'run /brief'.length, ['brief'])).toEqual(
      {
        changed: true,
        nextText: 'run  today',
        cursor: 'run '.length,
      },
    )
  })

  it('leaves text unchanged when backspace is not on a known slash command', () => {
    expect(getSlashBackspaceTextUpdate('run /unknown', 'run /unknown'.length, ['brief'])).toEqual({
      changed: false,
      nextText: 'run /unknown',
      cursor: 'run /unknown'.length,
    })
  })
})
