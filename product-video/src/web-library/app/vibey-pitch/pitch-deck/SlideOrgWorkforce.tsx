import { Slide, SlideLabel, SlideSub, SlideTitle } from './slide-primitives'

export function SlideOrgWorkforce() {
  return (
    <Slide>
      <SlideLabel>The Organized Workforce</SlideLabel>
      <SlideTitle>
        AN{' '}
        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          ORGANIZED WORKFORCE
        </span>
      </SlideTitle>
      <SlideSub>All working together in an organizational hierarchy.</SlideSub>
      <div className="mt-8 text-center text-base text-white/40">
        If you were hiring employees, how would you structure them?
      </div>
      <div className="mt-8 grid w-full max-w-3xl gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-6 text-center">
          <div className="text-3xl font-bold text-emerald-400">1</div>
          <div className="mt-2 text-sm font-semibold text-white">Give them SOPs</div>
          <p className="mt-1 text-xs text-white/40">
            A strategy. A system. Clear instructions on how to do the work.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-6 text-center">
          <div className="text-3xl font-bold text-blue-400">2</div>
          <div className="mt-2 text-sm font-semibold text-white">Give them the result</div>
          <p className="mt-1 text-xs text-white/40">
            What does success look like? What goal are they moving toward?
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-6 text-center">
          <div className="text-3xl font-bold text-amber-400">3</div>
          <div className="mt-2 text-sm font-semibold text-white">Tell them: go.</div>
          <p className="mt-1 text-xs text-white/40">
            And they move toward it. Autonomously. Reliably. Around the clock.
          </p>
        </div>
      </div>
      <p className="mt-8 text-center text-sm italic text-white/25">
        That&apos;s exactly what Vibey does — but with AI agents instead of employees.
      </p>
    </Slide>
  )
}
