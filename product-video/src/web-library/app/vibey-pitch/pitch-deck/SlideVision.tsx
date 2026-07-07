import { Slide, SlideLabel, SlideTitle } from './slide-primitives'

export function SlideVision() {
  return (
    <Slide>
      <SlideLabel>The Vision</SlideLabel>
      <SlideTitle>THE FUTURE</SlideTitle>
      <div className="mt-10 flex w-full max-w-4xl flex-col gap-6 md:flex-row">
        {[
          {
            phase: 'Phase 1',
            title: 'Vibey',
            desc: 'Dominate the attention graph. Creators, coaches, agencies, performance marketers.',
            active: true,
          },
          {
            phase: 'Phase 2',
            title: 'LLM + Compute',
            desc: 'Custom LLM models. Purpose-built for marketing and business operations.',
            active: false,
          },
          {
            phase: 'Phase 3',
            title: 'Hardware + Compute',
            desc: 'Compute for margin & moat. Ambient AI layer. On-body devices.',
            active: false,
          },
        ].map((p) => (
          <div
            key={p.phase}
            className={`flex-1 rounded-2xl border p-6 ${p.active ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/8 bg-white/[0.03]'}`}
          >
            <div
              className={`text-xs font-bold uppercase tracking-wider ${p.active ? 'text-emerald-400' : 'text-white/30'}`}
            >
              {p.phase}
            </div>
            <div className="mt-2 text-xl font-bold text-white">{p.title}</div>
            <p className="mt-2 text-sm text-white/40">{p.desc}</p>
            {p.active && (
              <div className="mt-3 inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                Current
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-12 text-center font-[family-name:var(--font-site-headline)] text-2xl font-bold text-white/80 md:text-3xl">
        Your AI Team. Ready to Work.
      </p>
    </Slide>
  )
}
