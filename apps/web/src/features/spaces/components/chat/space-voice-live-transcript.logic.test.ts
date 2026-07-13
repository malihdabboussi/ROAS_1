import { describe, expect, it } from 'vitest'
import {
  getLiveInputPlaceholder,
  getLiveOutputPlaceholder,
  isVoiceAssistantStreaming,
  normalizeAudioLevel,
} from './space-voice-live-transcript.logic'

describe('space-voice-live-transcript.logic', () => {
  it('normalizes audio levels into a 0-100 range', () => {
    expect(normalizeAudioLevel(0)).toBe(0)
    expect(normalizeAudioLevel(0.25)).toBe(100)
    expect(normalizeAudioLevel(0.5)).toBe(100)
  })

  it('returns mic placeholders for muted and listening states', () => {
    expect(getLiveInputPlaceholder('listening', true)).toContain('muted')
    expect(getLiveInputPlaceholder('listening', false)).toContain('Speak now')
  })

  it('returns agent placeholders for speaking and idle states', () => {
    expect(getLiveOutputPlaceholder('speaking', 'Atlas')).toContain('speaking')
    expect(getLiveOutputPlaceholder('listening', 'Atlas')).toContain('Atlas will respond')
  })

  it('detects streaming voice assistant messages', () => {
    expect(isVoiceAssistantStreaming('voice-assistant-123', 'speaking')).toBe(true)
    expect(isVoiceAssistantStreaming('voice-assistant-123', 'idle')).toBe(false)
    expect(isVoiceAssistantStreaming('msg-123', 'speaking')).toBe(false)
  })
})
