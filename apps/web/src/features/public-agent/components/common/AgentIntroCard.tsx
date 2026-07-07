'use client'

import type { PublicAgentInfo } from '../../types/public-agent.types'

const STARTERS = ['What can you help me with?', 'Tell me about yourself', 'How do you work?']

interface AgentIntroCardProps {
  agent: PublicAgentInfo
  onStarterClick: (text: string) => void
  disabled?: boolean
}

export function AgentIntroCard({ agent, onStarterClick, disabled = false }: AgentIntroCardProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      {agent.imageUrl ? (
        <img
          src={agent.imageUrl}
          alt={agent.name}
          className="mb-5 h-24 w-24 rounded-full border-2 border-white/10 object-cover shadow-[0_0_40px_8px_rgba(255,255,255,0.04)]"
        />
      ) : (
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/10 bg-white/5 text-3xl font-bold text-white/30">
          {agent.name.charAt(0).toUpperCase()}
        </div>
      )}

      <h2 className="body-1 text-foreground mb-1 text-center font-bold">{agent.name}</h2>
      <p className="body-3 text-muted-foreground/60 mb-8 text-center">{agent.role}</p>

      <div className="flex flex-wrap justify-center gap-2">
        {STARTERS.map((text) => (
          <button
            key={text}
            type="button"
            disabled={disabled}
            onClick={() => onStarterClick(text)}
            className="body-4 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
