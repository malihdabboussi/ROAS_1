'use client'

export type OrbAnimationStyle = 'elastic' | 'trails' | 'constellation' | 'liquid' | 'firefly'

interface VibeyChatOrbProps {
  state?:
    | 'idle'
    | 'processing'
    | 'thinking'
    | 'streaming'
    | 'executing'
    | 'reconnecting'
    | 'complete'
  style?: OrbAnimationStyle
  className?: string
  cycleDuration?: number
}

const STATE_CLASS_MAP: Record<string, string> = {
  processing: 'vibey-chat-orb--processing',
  thinking: 'vibey-chat-orb--thinking',
  streaming: 'vibey-chat-orb--processing',
  executing: 'vibey-chat-orb--executing',
  reconnecting: 'vibey-chat-orb--reconnecting',
  complete: 'vibey-chat-orb--complete',
}

export function VibeyChatOrb({
  state = 'idle',
  style = 'elastic',
  className,
  cycleDuration,
}: VibeyChatOrbProps) {
  const stateClass = STATE_CLASS_MAP[state] ?? ''
  const styleClass = `vibey-chat-orb--${style}`
  const inlineStyle = cycleDuration
    ? ({ '--cycle-duration': `${cycleDuration}ms` } as React.CSSProperties)
    : undefined

  return (
    <div
      className={`vibey-chat-orb ${stateClass} ${styleClass} ${className ?? ''}`}
      style={inlineStyle}
    >
      <div className="vibey-chat-orb-core" />
      <div className="vibey-chat-orb-dot vibey-chat-orb-dot--1" />
      <div className="vibey-chat-orb-dot vibey-chat-orb-dot--2" />
      <div className="vibey-chat-orb-dot vibey-chat-orb-dot--3" />
      <div className="vibey-chat-orb-dot vibey-chat-orb-dot--4" />
    </div>
  )
}
