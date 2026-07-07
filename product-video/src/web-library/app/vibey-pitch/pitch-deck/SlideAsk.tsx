import { Slide, SlideLabel } from './slide-primitives'

export function SlideAsk() {
  return (
    <Slide>
      <SlideLabel>The Ask</SlideLabel>
      <div className="flex flex-col items-center">
        <h2 className="font-[family-name:var(--font-site-headline)] text-5xl font-bold text-white md:text-7xl">
          $5.5M
        </h2>
        <p className="mt-2 text-lg text-white/40">for 10% equity&ensp;|&ensp;$55M post-money</p>
      </div>
      <div className="mt-8 grid w-full max-w-3xl gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/50">
            Use of Funds
          </h4>
          <div className="space-y-2">
            {[
              { label: 'Team / Payroll (24mo)', amount: '$2.5M', pct: 45 },
              { label: 'R&D (agents, skills, tokens)', amount: '$1.0M', pct: 18 },
              { label: 'Infra + Compliance', amount: '$750K', pct: 14 },
              { label: 'Marketing & Growth', amount: '$500K', pct: 9 },
              { label: 'Operations + Buffer', amount: '$750K', pct: 14 },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-emerald-500/50"
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-semibold text-white/60">
                  {f.amount}
                </span>
                <span className="w-32 shrink-0 text-xs text-white/40">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/50">
            12–18 Month Milestones
          </h4>
          <div className="space-y-2 text-sm text-white/60">
            {[
              { k: 'Users', v: '10,000' },
              { k: 'Enterprise', v: '200+' },
              { k: 'MRR', v: '$500K+' },
              { k: 'Compliance', v: 'SOC2 + HIPAA' },
            ].map((m) => (
              <div
                key={m.k}
                className="border-white/8 flex justify-between rounded-lg border bg-white/[0.03] px-3 py-2"
              >
                <span>{m.k}</span>
                <span className="font-semibold text-white">{m.v}</span>
              </div>
            ))}
            <div className="flex justify-between rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2">
              <span>Series A</span>
              <span className="font-semibold text-emerald-400">$100M+</span>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  )
}
