import type { MissionAgent } from '../types'

export function AgentCell({ agentKey, agents }: { agentKey: string | null; agents: MissionAgent[] }) {
  if (!agentKey) return <span className="body-4 text-[var(--color-muted-foreground)]">—</span>
  const agent = agents.find((a) => a.agent_key === agentKey)
  if (!agent) {
    return (
      <span className="body-4 text-[var(--color-muted-foreground)]">
        {agentKey.charAt(0).toUpperCase() + agentKey.slice(1)}
      </span>
    )
  }
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {agent.image_url ? (
        <img
          src={agent.image_url}
          alt={agent.name}
          className="h-6 w-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="bg-primary/20 text-primary body-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold leading-none">
          {agent.name.charAt(0)}
        </div>
      )}
      <span className="body-4 min-w-0 flex-1 truncate text-left font-medium leading-tight text-[var(--foreground)]">
        {agent.name}
      </span>
    </div>
  )
}

export function AgentsStackCell({
  agentKeys,
  agents,
}: {
  agentKeys: string[]
  agents: MissionAgent[]
}) {
  if (agentKeys.length === 0)
    return <span className="body-4 text-[var(--color-muted-foreground)]">—</span>
  return (
    <div className="flex items-center">
      {agentKeys.map((key, i) => {
        const agent = agents.find((a) => a.agent_key === key)
        return (
          <div
            key={key}
            className={i > 0 ? '-ml-1.5' : ''}
            title={agent ? `${agent.name}${agent.role ? ` — ${agent.role}` : ''}` : key}
          >
            {agent?.image_url ? (
              <img
                src={agent.image_url}
                alt={agent.name}
                className="h-6 w-6 rounded-full object-cover ring-2 ring-[var(--color-card)]"
              />
            ) : (
              <div className="bg-primary/20 text-primary body-4 flex h-6 w-6 items-center justify-center rounded-full font-bold leading-none ring-2 ring-[var(--color-card)]">
                {(agent?.name ?? key).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
