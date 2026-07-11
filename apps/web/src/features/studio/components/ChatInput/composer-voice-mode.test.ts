import { beforeEach, describe, expect, it } from 'vitest'
import {
  readComposerVoiceDefault,
  voiceDefaultScopeKey,
  writeComposerVoiceDefault,
} from './composer-voice-mode'

describe('composer-voice-mode', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists defaults per space scope', () => {
    expect(voiceDefaultScopeKey(null)).toBe('__global__')
    expect(readComposerVoiceDefault(null)).toBe('input')

    writeComposerVoiceDefault('space-1', 'live')
    expect(readComposerVoiceDefault('space-1')).toBe('live')
    expect(readComposerVoiceDefault('space-2')).toBe('input')
  })
})
