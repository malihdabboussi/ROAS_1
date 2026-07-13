import type { LiveSessionState } from '@/features/brain/hooks/use-brain-live-session'

export function normalizeAudioLevel(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.min(100, Math.round(raw * 400))
}

export function getLiveInputPlaceholder(state: LiveSessionState, isMuted: boolean): string {
  if (isMuted) return 'Mic is muted — unmute to speak'
  if (state === 'listening') return 'Speak now — your words will appear here'
  if (state === 'toolCall') return 'Working on a task…'
  if (state === 'speaking') return 'Listening while Atlas speaks…'
  return 'Waiting for your speech…'
}

export function getLiveOutputPlaceholder(state: LiveSessionState, agentName: string): string {
  if (state === 'speaking') return `${agentName} is speaking — text appears here even if audio is muted`
  if (state === 'toolCall') return `${agentName} is working…`
  return `${agentName} will respond here (text and audio)`
}

export function isVoiceAssistantStreaming(messageId: string, state: LiveSessionState): boolean {
  return messageId.startsWith('voice-assistant-') && state !== 'idle' && state !== 'error'
}
