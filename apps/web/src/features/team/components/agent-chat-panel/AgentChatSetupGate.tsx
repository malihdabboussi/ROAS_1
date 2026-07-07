import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgent } from '@/lib/agents'
import { repairAgentSetup, reportTeamError } from '@/lib/agents'
import { AGENT_SETUP_STALE_MS } from './agent-chat-panel.logic'

interface AgentChatSetupGateProps {
  agent: MissionAgent
  onAgentSetupRepaired?: (agentKey: string) => void | Promise<void>
  children: ReactNode
}

export function AgentChatSetupGate({
  agent,
  onAgentSetupRepaired,
  children,
}: AgentChatSetupGateProps) {
  const [setupRepairing, setSetupRepairing] = useState(false)
  const [setupRepairStatus, setSetupRepairStatus] = useState<'ready' | 'failed' | null>(null)
  const [setupRepairReasons, setSetupRepairReasons] = useState<string[]>([])
  const autoSetupRepairAttemptedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    setSetupRepairStatus(null)
    setSetupRepairReasons([])
    setSetupRepairing(false)
  }, [agent.agent_key])

  useEffect(() => {
    if (agent.sync_status === 'ready') {
      setSetupRepairStatus(null)
      setSetupRepairReasons([])
      setSetupRepairing(false)
    }
  }, [agent.sync_status])

  const runSetupRepair = useCallback(
    async (manual = false) => {
      if (setupRepairing) return
      setSetupRepairing(true)
      setSetupRepairReasons([])
      try {
        const result = await repairAgentSetup(agent.agent_key)
        setSetupRepairStatus(result.sync_status)
        setSetupRepairReasons(result.reasons ?? [])
        if (result.sync_status === 'ready') {
          await onAgentSetupRepaired?.(agent.agent_key)
        }
      } catch (err) {
        reportTeamError('agent_setup_repair_failed', err, { agentKey: agent.agent_key })
        setSetupRepairStatus('failed')
        setSetupRepairReasons([err instanceof Error ? err.message : 'setup_repair_failed'])
        if (manual) toast.error(`I couldn't refresh ${agent.name}'s setup. Try again in a moment.`)
      } finally {
        setSetupRepairing(false)
      }
    },
    [agent.agent_key, agent.name, onAgentSetupRepaired, setupRepairing],
  )

  const agentSetupUpdatedAtMs = Date.parse(agent.updated_at)
  const effectiveSyncStatus = setupRepairStatus ?? agent.sync_status
  const agentSetupIsStale =
    effectiveSyncStatus === 'syncing' &&
    Number.isFinite(agentSetupUpdatedAtMs) &&
    Date.now() - agentSetupUpdatedAtMs > AGENT_SETUP_STALE_MS
  const agentSetupFailed = effectiveSyncStatus === 'failed'

  useEffect(() => {
    if (!agentSetupIsStale || setupRepairing) return
    if (autoSetupRepairAttemptedRef.current.has(agent.agent_key)) return
    autoSetupRepairAttemptedRef.current.add(agent.agent_key)
    void runSetupRepair(false)
  }, [agent.agent_key, agentSetupIsStale, runSetupRepair, setupRepairing])

  if (!effectiveSyncStatus || effectiveSyncStatus === 'ready') return <>{children}</>

  const agentSetupText = setupRepairing
    ? `I'm refreshing ${agent.name}'s setup...`
    : agentSetupFailed
      ? `Setup needs another try for ${agent.name}.`
      : agentSetupIsStale
        ? `Setup is taking longer than expected for ${agent.name}.`
        : `Setting up ${agent.name}...`
  const agentSetupState = setupRepairing
    ? 'processing'
    : agentSetupFailed || agentSetupIsStale
      ? 'idle'
      : 'processing'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
      <VibeyLoadingOrb text={agentSetupText} state={agentSetupState} size="lg" />
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        {setupRepairing ? (
          <p className="body-3 text-muted-foreground">
            Hang tight, I'm dialing this back in.
          </p>
        ) : agentSetupFailed ? (
          <>
            <p className="body-3 text-muted-foreground">
              Something got tangled up during setup. I can try again now.
            </p>
            {setupRepairReasons[0] ? (
              <p className="typo-caption text-muted-foreground">{setupRepairReasons[0]}</p>
            ) : null}
            <button
              type="button"
              className="button-default button-glass-primary"
              onClick={() => void runSetupRepair(true)}
            >
              Retry setup
            </button>
          </>
        ) : agentSetupIsStale ? (
          <p className="body-3 text-muted-foreground">
            I'm giving setup another shot automatically.
          </p>
        ) : null}
      </div>
    </div>
  )
}
