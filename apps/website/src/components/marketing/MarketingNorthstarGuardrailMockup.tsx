'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  Target,
  Zap,
  Lock
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const GUARDRAILS = [
  { id: 'result', label: 'Primary Result', value: '100+ High-intent leads / mo', detail: 'Targeting SaaS founders specifically.' },
  { id: 'purpose', label: 'Core Purpose', value: 'Pipeline generation for Q2', detail: 'Educate on the value of AI flows.' },
  { id: 'offlimits', label: 'Off-Limits', value: 'No clickbait, no deceptive claims', detail: 'Keep brand voice authoritative.' },
]

const SENTINEL_FEED = [
  { mission: 'Drafting Q2 Landing Page', check: 'Matches Brand Voice', status: 'pass' },
  { mission: 'Researching Competitors', check: 'Alignment: Pipeline Goal', status: 'pass' },
  { mission: 'Generating Ad Headlines', check: 'Constraint Check: No Clickbait', status: 'pass' },
  { mission: 'Email Nurture Sequence', check: 'Serves Primary Result', status: 'pass' },
]

export function MarketingNorthstarGuardrailMockup() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    let isMounted = true
    let timeoutId: any

    const runStepAfterMove = () => {
      if (!isMounted) return
      setIsScanning(true)
      timeoutId = setTimeout(() => {
        if (!isMounted) return
        setIsScanning(false)
        timeoutId = setTimeout(() => {
          if (!isMounted) return
          setActiveIdx((prev) => (prev + 1) % SENTINEL_FEED.length)
          runStepAfterMove()
        }, 1500)
      }, 2500)
    }

    runStepAfterMove()

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  return (
    <FeatureFloatingMockShell className="!min-h-[420px]">
      <div className="relative h-full w-full overflow-hidden p-6 lg:flex-row lg:gap-8">
        <div className="relative z-10 flex h-full w-full flex-col lg:flex-row lg:gap-8">
          {/* ── Left Column: Strategy Guardrails ── */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-white">The North Star</h2>
          </div>

          <div className="space-y-3">
            {GUARDRAILS.map((g) => (
              <div 
                key={g.id} 
                className="relative overflow-hidden p-4 rounded-xl transition-colors duration-500 bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 shadow-xl"
              >
                {/* Laser Scan Effect */}
                {isScanning && (
                  <motion.div 
                    initial={{ top: '-100%' }}
                    animate={{ top: '200%' }}
                    transition={{ duration: 1.5, ease: 'linear' }}
                    className="absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent pointer-events-none z-10"
                  />
                )}
                
                <div className="flex items-center gap-3 mb-1.5">
                  {g.id === 'result' ? <Target size={14} className="text-emerald-400" /> : 
                   g.id === 'purpose' ? <Zap size={14} className="text-purple-400" /> : 
                   <Lock size={14} className="text-red-400" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{g.label}</span>
                </div>
                <p className="text-[12px] font-bold text-white mb-1">{g.value}</p>
                <p className="text-[10px] text-white/30">{g.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column: Strategy Validation ── */}
        <div className="flex flex-[1.2] flex-col gap-4 mt-8 lg:mt-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Strategy Validation</h2>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 relative">
            <AnimatePresence mode="popLayout">
              {SENTINEL_FEED.map((item, i) => {
                const isActive = i === activeIdx
                if (!isActive && i !== (activeIdx + 1) % SENTINEL_FEED.length && i !== (activeIdx - 1 + SENTINEL_FEED.length) % SENTINEL_FEED.length) return null

                const isAnalyzing = i === activeIdx && isScanning
                const isValidated = i === activeIdx ? !isScanning : i === (activeIdx - 1 + SENTINEL_FEED.length) % SENTINEL_FEED.length

                return (
                  <motion.div
                    key={`${item.mission}-${i}`}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ 
                      opacity: isActive ? 1 : 0.5, 
                      y: 0, 
                      scale: isActive ? 1 : 0.95,
                    }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className={`p-4 rounded-xl border transition-all duration-500 ${isActive ? 'bg-gradient-to-br from-white/[0.12] to-white/[0.05] border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.08)]' : 'bg-gradient-to-br from-white/[0.05] to-white/[0.02] border-white/5 opacity-60'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white truncate mb-1">{item.mission}</p>
                        <div className="flex items-center gap-2">
                          <Search size={10} className="text-white/20" />
                          <span className="text-[10px] text-white/40">{item.check}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className={`flex items-center gap-1 ${isValidated ? 'text-emerald-400' : isAnalyzing ? 'text-purple-400' : 'text-white/20'}`}>
                        {isValidated ? (
                          <CheckCircle2 size={12} />
                        ) : isAnalyzing ? (
                          <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          >
                            <Search size={12} />
                          </motion.div>
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-white/10" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-tighter">
                          {isValidated ? 'Validated' : isAnalyzing ? 'Analyzing...' : 'To Analyze'}
                        </span>
                      </div>
                        <span className="text-[8px] text-white/20 font-mono">
                          {isValidated ? 'POST-SCAN' : isAnalyzing ? 'SCANNING' : 'QUEUED'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Validation Terminal Output */}
            <div className="mt-auto pt-4 border-t border-white/5">
              <div className="bg-white/[0.05] rounded-lg p-3 font-mono text-[9px] space-y-1 border border-white/5 shadow-inner">
                <div className="text-white/20">AUTOPILOT_COMPLIANCE_LOG:</div>
                <div className="text-emerald-400/80">&gt;&gt; MISSION_INPUT: validated against NORTHSTAR_STRATEGY</div>
                <div className="text-emerald-400/80">&gt;&gt; BRAND_VOICE_CHECK: pass (ACCOUNTABILITY_ID: 402)</div>
                <div className="text-white/40 animate-pulse">&gt;&gt; MONITORING_LIVE_MISSIONS...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </FeatureFloatingMockShell>
  )
}
