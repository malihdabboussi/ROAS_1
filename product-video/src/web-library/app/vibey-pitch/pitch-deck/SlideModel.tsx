import { Slide, SlideLabel, SlideSub, SlideTitle } from './slide-primitives'

export function SlideModel() {
  return (
    <Slide>
      <SlideLabel>Business Model</SlideLabel>
      <SlideTitle>THE MODEL</SlideTitle>
      <SlideSub>
        Two engines. SaaS scales horizontally. Enterprise scales revenue per account.
      </SlideSub>
      <div className="mt-8 grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/50">
            Tier-Based SaaS
          </h4>
          <div className="flex gap-2">
            {[
              { name: 'Free', price: '$0' },
              { name: 'Basic', price: '$20' },
              { name: 'Pro', price: '$40' },
              { name: 'Ultra', price: '$200' },
            ].map((p) => (
              <div
                key={p.name}
                className="border-white/8 flex-1 rounded-xl border bg-white/[0.03] p-3 text-center"
              >
                <div className="text-[10px] text-white/40">{p.name}</div>
                <div className="mt-1 text-lg font-bold text-white">{p.price}</div>
                <div className="text-[9px] text-white/25">/mo</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/30">+ Credit-based usage on top</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-6">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-400">
            Service as a Product
          </h4>
          <p className="text-sm text-white/60">
            Dedicated onboarding, buildout, and integration for enterprise clients. We set up and
            install their AI agent workforce — customized to their business.
          </p>
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center text-sm font-semibold text-emerald-400">
            $9K – $20K+/mo retainers
          </div>
        </div>
      </div>
    </Slide>
  )
}
