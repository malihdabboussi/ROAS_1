'use client'

import React, { useId, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target,
  Zap,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  RotateCcw
} from 'lucide-react'
import { 
  MARKETING_AGENT_LIBRARY_FALLBACK, 
  VIBEY_MARKETING_PORTRAIT_FALLBACK 
} from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

const DELEGATION_ROLES = ['copywriter', 'designer', 'analyst', 'pm_marketing'] as const

type AgentStatus = 'idle' | 'blocked' | 'retrying' | 'waiting_feedback' | 'done' | 'acting' | 'busy'

function resolveAgents(libraryAgents?: PublicAgentLibraryRow[]): PublicAgentLibraryRow[] {
  return DELEGATION_ROLES.map((key) => {
    const fromHero = libraryAgents?.find((a) => a.role_key === key)
    if (fromHero) return fromHero
    const row = MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === key)
    if (!row) throw new Error(`Dynamic router mockup: missing agent ${key}`)
    return row
  })
}

/** Animated "Currents" SVG - Supports multiple active flows */
function RouterConnectorLines({ activePaths }: { activePaths: number[] }) {
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  return (
    <svg
      className="text-color-dimmer pointer-events-none w-full shrink-0"
      viewBox="0 0 100 22"
      height="60"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={g('purple-grad')} fx="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        
        {/* Mask paths for the electric current effect */}
        {[0, 1, 2, 3].map(i => (
          <mask key={i} id={g('mask-' + i)}>
            <path 
              d={i === 0 ? "M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13" :
                 i === 1 ? "M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13" :
                 i === 2 ? "M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13" :
                           "M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13"}
              strokeWidth="1" stroke="white" fill="none" 
            />
          </mask>
        ))}
      </defs>

      {/* Static connector lines */}
      <g stroke="currentColor" fill="none" strokeWidth="0.4" strokeDasharray="100 100" pathLength="100">
        <path id={g('p-0')} d="M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13" />
        <path id={g('p-1')} d="M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13" />
        <path id={g('p-2')} d="M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13" />
        <path id={g('p-3')} d="M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13" />
      </g>

      {/* Multiple Animated "Purple Currents" */}
      <AnimatePresence>
        {activePaths.map(idx => (
          <motion.g 
            key={idx}
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            mask={`url(#${g('mask-' + idx)})`}
          >
            <circle r="6" fill={`url(#${g('purple-grad')})`}>
              <animateMotion dur="2s" repeatCount="indefinite">
                <mpath href={`#${g('p-' + idx)}`} />
              </animateMotion>
            </circle>
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  )
}

export function MarketingDynamicRouterMockup(props?: {
  libraryAgents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}) {
  const agents = resolveAgents(props?.libraryAgents)
  const vibeySrc = props?.vibeyPortraitUrl?.trim() || VIBEY_MARKETING_PORTRAIT_FALLBACK
  
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(['blocked', 'waiting_feedback', 'idle', 'idle'])
  const [activePaths, setActivePaths] = useState<number[]>([])
  const [logs, setLogs] = useState<string[]>(['>> MONITORING_OPERATIONS...'])

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5))
  }

  useEffect(() => {
    let isMounted = true
    const cycle = async () => {
      if (!isMounted) return
      
      // Step 0: Initial static state
      setAgentStatuses(['blocked', 'waiting_feedback', 'idle', 'idle'])
      setActivePaths([])
      await new Promise(r => setTimeout(r, 2000))

      if (!isMounted) return
      // Step 1: Self-healing Ivy (Blocked -> Retrying)
      addLog('>> RECOVERY_MODE: Resolving block for Ivy (Copywriter)')
      setActivePaths([0])
      await new Promise(r => setTimeout(r, 1000))
      setAgentStatuses(prev => { const n = [...prev]; n[0] = 'retrying'; return n })
      await new Promise(r => setTimeout(r, 2000))

      if (!isMounted) return
      // Step 2: Finalizing Lux (Waiting Feedback -> Done)
      addLog('>> FEEDBACK_SYNC: Received approval for Lux (Designer)')
      setActivePaths([1])
      await new Promise(r => setTimeout(r, 1000))
      setAgentStatuses(prev => { const n = [...prev]; n[1] = 'done'; return n })
      await new Promise(r => setTimeout(r, 2500))

      if (!isMounted) return
      // Step 3: New Delegation to Niko (Idle -> Acting)
      addLog('>> AUTONOMOUS_DELEGATION: Assigning Lead Data to Niko')
      setActivePaths([2])
      await new Promise(r => setTimeout(r, 1000))
      setAgentStatuses(prev => { const n = [...prev]; n[2] = 'acting'; return n })
      await new Promise(r => setTimeout(r, 3000))

      if (isMounted) cycle()
    }

    cycle()
    return () => { isMounted = false }
  }, [])

  return (
    <div className="compare-hero-card-shell border-color-glass bg-color-panel-mid relative aspect-auto min-h-[460px] w-full overflow-hidden rounded-2xl border backdrop-blur-xl">
      <div className="compare-hero-brain-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex h-full min-h-[460px] w-full flex-col overflow-hidden p-6">
      {/* ── CEO Hub ── */}
      <div className="relative z-20 flex justify-center pt-2">
        <div className="glass-card flex min-w-[180px] flex-col items-center gap-2 p-4 shadow-2xl">
          <div className="relative">
            <div className="border-emerald-500/30 h-14 w-14 overflow-hidden rounded-full border-2 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
              <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-4 border-[#0a0a0a]" />
          </div>
          <div className="text-center">
            <p className="text-[12px] font-bold text-white uppercase tracking-wider">Pixel</p>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Autonomous CEO</p>
          </div>
        </div>
      </div>

      {/* ── Router Lines ── */}
      <div className="relative -mt-2 z-10 px-4">
        <RouterConnectorLines activePaths={activePaths} />
      </div>

      {/* ── Agent Fleet ── */}
      <div className="grid grid-cols-4 gap-3 relative z-20">
        {agents.map((agent, i) => {
          const status = agentStatuses[i]
          const isTarget = activePaths.includes(i)
          
          return (
            <div key={agent.role_key} className="relative group">
              <motion.div 
                animate={isTarget ? { y: [0, -4, 0] } : {}}
                transition={{ repeat: isTarget ? Infinity : 0, duration: 2 }}
                className={`glass-card flex flex-col items-center gap-2 p-3 transition-all duration-500 ${
                  status === 'blocked' ? 'border-red-500/40 bg-red-500/5' :
                  status === 'retrying' ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]' :
                  status === 'done' ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]' :
                  status === 'acting' ? 'border-purple-500/40 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.1)]' :
                  'bg-white/[0.02] border-white/5 opacity-60'
                }`}
              >
                <div className="relative">
                  <img
                    src={agent.image_url}
                    alt=""
                    className={`h-10 w-10 rounded-full object-cover border-2 ${
                      status === 'blocked' ? 'border-red-500' :
                      status === 'retrying' ? 'border-amber-500' :
                      status === 'done' ? 'border-emerald-500' :
                      status === 'acting' ? 'border-purple-500' :
                      'border-white/10'
                    }`}
                  />
                  {status === 'blocked' && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-[#0a0a0a]">
                      <AlertCircle size={10} className="text-white" />
                    </div>
                  )}
                  {status === 'retrying' && (
                    <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-[#0a0a0a]">
                      <RotateCcw size={10} className="text-white animate-spin" />
                    </div>
                  )}
                  {status === 'waiting_feedback' && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-[#0a0a0a]">
                      <Clock size={10} className="text-white" />
                    </div>
                  )}
                  {status === 'done' && (
                    <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-[#0a0a0a]">
                      <CheckCircle2 size={10} className="text-white" />
                    </div>
                  )}
                </div>
                
                <div className="text-center min-w-0 w-full">
                  <p className="text-[10px] font-bold text-white truncate">{agent.default_name}</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase truncate">{agent.role.split(' ')[agent.role.split(' ').length - 1]}</p>
                </div>

                {/* Status Indicator */}
                <div className="mt-1 flex items-center gap-1.5">
                  <div className={`h-1 w-1 rounded-full ${
                    status === 'blocked' ? 'bg-red-500 animate-pulse' :
                    status === 'retrying' ? 'bg-amber-500 animate-pulse' :
                    status === 'done' ? 'bg-emerald-500' :
                    status === 'acting' ? 'bg-purple-500 animate-pulse' :
                    status === 'waiting_feedback' ? 'bg-blue-500' :
                    'bg-white/10'
                  }`} />
                  <span className={`text-[8px] font-bold uppercase tracking-widest whitespace-nowrap ${
                    status === 'blocked' ? 'text-red-400' :
                    status === 'retrying' ? 'text-amber-400' :
                    status === 'done' ? 'text-emerald-400' :
                    status === 'acting' ? 'text-purple-400' :
                    status === 'waiting_feedback' ? 'text-blue-400' :
                    'text-white/20'
                  }`}>
                    {status.replace('_', ' ')}
                  </span>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* ── Logic Terminal (Bottom) ── */}
      <div className="mt-auto pt-6">
        <div className="bg-black/40 rounded-lg p-4 font-mono text-[10px] space-y-1.5 border border-white/5 shadow-inner relative overflow-hidden">
          <div className="flex items-center justify-between text-white/20 mb-1">
            <span>AUTOPILOT_ROUTING_ENGINE</span>
            <div className="flex gap-1">
              <div className="h-1 w-1 rounded-full bg-white/20" />
              <div className="h-1 w-1 rounded-full bg-white/20" />
            </div>
          </div>
          
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className={i === 0 ? 'text-emerald-400/80 font-bold' : 'text-white/40'}>
                {log}
              </div>
            ))}
            <div className="text-white/20 animate-pulse">&gt;&gt; MONITORING_OPERATIONS...</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
