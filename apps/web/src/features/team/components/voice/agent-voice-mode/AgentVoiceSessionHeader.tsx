import type { MutableRefObject } from 'react'
import { Loader2, Mic, MicOff, PhoneOff, RotateCcw } from 'lucide-react'
import {
  BrainVoiceOrbScene,
  type OrbAnimationState,
} from '@/components/chat/BrainVoiceOrbSceneAdapter'
import { StatusIndicator } from '@/components/chat/StatusIndicatorAdapter'
import type { LiveSessionState } from '@/lib/brain/brain-live-session-adapter'
import { formatVoiceElapsedTime } from './agent-voice-mode-utils'

interface AgentVoiceSessionHeaderProps {
  agentName: string
  state: LiveSessionState
  orbState: OrbAnimationState
  audioLevelRef: MutableRefObject<number>
  error: string | null
  elapsed: number
  isMuted: boolean
  conversationId: string | null
  sessionStarted: boolean
  onReconnect: () => void
  onToggleMute: () => void
  onEnd: () => void
}

export function AgentVoiceSessionHeader({
  agentName,
  state,
  orbState,
  audioLevelRef,
  error,
  elapsed,
  isMuted,
  conversationId,
  sessionStarted,
  onReconnect,
  onToggleMute,
  onEnd,
}: AgentVoiceSessionHeaderProps) {
  const isActive = state === 'listening' || state === 'speaking' || state === 'toolCall'

  return (
    <div className="flex flex-col items-center px-4 py-6">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <BrainVoiceOrbScene animationState={orbState} audioLevelRef={audioLevelRef} size="mini" />
      </div>

      {state === 'connecting' && (
        <div className="text-muted-foreground mt-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="body-3">Connecting to {agentName}...</span>
        </div>
      )}

      {state === 'error' && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <p className="body-3 text-destructive">{error ?? 'Something went wrong'}</p>
          <VoiceReconnectActions onReconnect={onReconnect} onEnd={onEnd} />
        </div>
      )}

      {state === 'idle' && sessionStarted && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <p className="body-3 text-muted-foreground">Voice session ended</p>
          <VoiceReconnectActions onReconnect={onReconnect} onEnd={onEnd} />
        </div>
      )}

      {conversationId && (
        <div className="mt-2 w-full max-w-md">
          <StatusIndicator conversationIdOverride={conversationId} />
        </div>
      )}

      {isActive && (
        <div className="mt-3 flex items-center gap-4">
          <span className="body-4 text-muted-foreground font-mono">
            {formatVoiceElapsedTime(elapsed)}
          </span>
          <button
            type="button"
            onClick={onToggleMute}
            className={`btn-icon-glass rounded-full p-2 ${isMuted ? 'bg-destructive/20' : ''}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="h-4 w-4 text-destructive" />
            ) : (
              <Mic className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {isMuted && <span className="body-4 text-destructive">Muted</span>}
          <button
            type="button"
            onClick={onEnd}
            className="button-glass-destructive flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            End
          </button>
        </div>
      )}
    </div>
  )
}

function VoiceReconnectActions({
  onReconnect,
  onEnd,
}: {
  onReconnect: () => void
  onEnd: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onReconnect}
        className="button-glass-accent flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reconnect
      </button>
      <button
        type="button"
        onClick={onEnd}
        className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium"
      >
        Back to Chat
      </button>
    </div>
  )
}
