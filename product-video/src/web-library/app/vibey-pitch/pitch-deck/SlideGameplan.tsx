import { Slide, SlideLabel, SlideTitle } from './slide-primitives'

export function SlideGameplan() {
  return (
    <Slide>
      <SlideLabel>Distribution</SlideLabel>
      <SlideTitle>GAMEPLAN</SlideTitle>
      <div className="mt-8 grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-400">
            Acquisition
          </h4>
          <div className="space-y-2">
            {[
              {
                ch: 'Affiliates & Referral Partners',
                detail: 'Growing pipeline incl. Neel Dhingra case study',
              },
              {
                ch: 'Influencers / UGC / Content Creators',
                detail: 'Billions of views monthly in AI/marketing space',
              },
              {
                ch: 'Webinar / Community / Paid Ads',
                detail: 'Educational content that demonstrates the product',
              },
              {
                ch: 'Agency / White-Label',
                detail: 'Scale delivery across clients without scaling headcount',
              },
            ].map((c) => (
              <div
                key={c.ch}
                className="border-white/8 rounded-lg border bg-white/[0.03] px-3 py-2"
              >
                <div className="text-xs font-semibold text-white">{c.ch}</div>
                <div className="mt-0.5 text-[11px] text-white/40">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-blue-400">
            Retention
          </h4>
          <div className="space-y-2">
            {[
              { r: 'Community + coaches + workshops', detail: 'Integrated support ecosystem' },
              {
                r: 'Memory that compounds',
                detail: 'The longer you use Vibey, the more valuable it becomes',
              },
              {
                r: 'Switching cost = losing your trained AI team',
                detail: 'Skills, brain, context — all locked in',
              },
              { r: 'Enterprise relationships', detail: 'Dedicated onboarding and support' },
            ].map((c) => (
              <div key={c.r} className="border-white/8 rounded-lg border bg-white/[0.03] px-3 py-2">
                <div className="text-xs font-semibold text-white">{c.r}</div>
                <div className="mt-0.5 text-[11px] text-white/40">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Slide>
  )
}
