import { Zap } from 'lucide-react'
import { Slide, SlideLabel, SlideSub, SlideTitle } from './slide-primitives'

export function SlideMissions() {
  return (
    <Slide>
      <SlideLabel>How It Works</SlideLabel>
      <SlideTitle>MISSIONS</SlideTitle>
      <SlideSub>
        Business owners don&apos;t have time to sit and chat. Describe an idea. They make it happen.
      </SlideSub>
      <div className="border-white/8 mt-8 w-full max-w-2xl rounded-2xl border bg-white/[0.03] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15">
            <Zap size={18} className="text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Mission HQ</div>
            <div className="text-xs text-white/40">
              Kanban • delegation • self-healing • dependencies
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {[
            { step: '1', label: 'Brief', desc: 'You describe the mission in natural language' },
            {
              step: '2',
              label: 'Plan',
              desc: 'CEO agent breaks it into subtasks, assigns specialists',
            },
            {
              step: '3',
              label: 'Execute',
              desc: 'Parallel tasks run, dependencies tracked automatically',
            },
            {
              step: '4',
              label: 'Review',
              desc: 'Production-ready output. Comment to direct, or approve.',
            },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white/60">
                {s.step}
              </span>
              <div>
                <span className="text-sm font-semibold text-white">{s.label}</span>
                <span className="ml-2 text-sm text-white/40">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Slide>
  )
}
