import { Brain, RefreshCw, Zap } from 'lucide-react'
import { Slide, SlideLabel, SlideSub, SlideTitle } from './slide-primitives'

export function SlideWhyBest() {
  const rows = [
    {
      them: 'Claude creates a preview you look at inside the chat',
      vibey: 'Vibey deploys a live landing page to YOUR domain',
    },
    {
      them: 'ChatGPT writes ad copy you paste yourself',
      vibey: 'Vibey publishes ads directly to Meta with images and targeting',
    },
    {
      them: 'Mailchimp templates need manual setup',
      vibey: 'Vibey sends email sequences from your verified domain automatically',
    },
    {
      them: 'CRM requires manual data entry',
      vibey: 'Every form submission captured with source tracking',
    },
    {
      them: 'Project tools need you to manage tasks',
      vibey: 'The agent manages its own work — plans, executes, reviews, retries',
    },
  ]

  return (
    <Slide>
      <SlideLabel>The Solution</SlideLabel>
      <SlideTitle>WHY IT&apos;S BEST IN THE WORLD</SlideTitle>
      <SlideSub>
        Every other AI agent does one thing. This one does everything — and deploys it live.
      </SlideSub>

      <div className="border-white/8 mt-8 w-full max-w-4xl overflow-hidden rounded-xl border">
        <div className="border-white/8 grid grid-cols-2 border-b bg-white/[0.04]">
          <div className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/40">
            What Others Do
          </div>
          <div className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-400">
            What This Agent Does
          </div>
        </div>
        {rows.map((r) => (
          <div key={r.them} className="grid grid-cols-2 border-b border-white/5 last:border-0">
            <div className="px-4 py-3 text-xs text-white/40">{r.them}</div>
            <div className="px-4 py-3 text-xs font-medium text-emerald-400/80">{r.vibey}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid w-full max-w-4xl gap-4 md:grid-cols-3">
        <div className="border-white/8 rounded-xl border bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Brain size={14} className="text-emerald-400" /> Memory That Compounds
          </div>
          <p className="mt-2 text-xs text-white/40">
            Teach it once, it knows forever. Campaign 5 benefits from everything learned in
            campaigns 1-4.
          </p>
        </div>
        <div className="border-white/8 rounded-xl border bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Zap size={14} className="text-blue-400" /> Actually Goes Live
          </div>
          <p className="mt-2 text-xs text-white/40">
            Not previews — production. Funnels on your domain. Emails sending. Ads running. Leads
            captured.
          </p>
        </div>
        <div className="border-white/8 rounded-xl border bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <RefreshCw size={14} className="text-purple-400" /> Autonomous Operations
          </div>
          <p className="mt-2 text-xs text-white/40">
            Runs every 15 minutes. Self-heals stuck tasks. Strategic guardrails prevent drift.
          </p>
        </div>
      </div>
    </Slide>
  )
}
