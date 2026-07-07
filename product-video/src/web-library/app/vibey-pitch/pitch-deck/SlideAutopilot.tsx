import { Clock, Eye, RefreshCw, Shield } from 'lucide-react'
import { Slide, SlideLabel, SlideSub, SlideTitle } from './slide-primitives'

export function SlideAutopilot() {
  return (
    <Slide>
      <SlideLabel>Autonomous Operations</SlideLabel>
      <SlideTitle>AUTOPILOT</SlideTitle>
      <SlideSub>Once your agents have SOPs and goals — they run autonomously.</SlideSub>
      <div className="mt-8 grid w-full max-w-4xl gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {[
            {
              icon: Clock,
              label: 'Background Scheduler',
              desc: 'Runs every 15 minutes evaluating all active work',
            },
            {
              icon: Eye,
              label: 'CEO Awareness Loop',
              desc: 'Evaluates signals against your strategy: act, notify, or wait',
            },
            {
              icon: RefreshCw,
              label: 'Self-Healing',
              desc: 'Stuck work detected and retried automatically with smarter approaches',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="border-white/8 flex items-start gap-3 rounded-xl border bg-white/[0.03] p-4"
            >
              <item.icon size={16} className="mt-0.5 shrink-0 text-emerald-400/70" />
              <div>
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="mt-0.5 text-xs text-white/40">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-400">
            <Shield size={16} /> North Star Guardrails
          </div>
          <div className="mt-4 space-y-2">
            {[
              { q: 'What does success look like?', a: 'Result' },
              { q: 'Why does this campaign exist?', a: 'Purpose' },
              { q: 'How are we getting there?', a: 'Strategy' },
              { q: 'What will we never do?', a: 'Off-Limits' },
            ].map((g) => (
              <div
                key={g.a}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
              >
                <span className="text-xs text-white/50">{g.q}</span>
                <span className="text-xs font-semibold text-purple-300">{g.a}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-white/30">
            If strategy isn&apos;t defined, proactive missions are blocked. Agents never go rogue —
            they ask first.
          </p>
        </div>
      </div>
    </Slide>
  )
}
