import { Slide, SlideLabel, SlideTitle, StatCard } from './slide-primitives'

export function SlideTraction() {
  return (
    <Slide>
      <SlideLabel>Traction</SlideLabel>
      <SlideTitle>BOOTSTRAPPED &amp; PROFITABLE</SlideTitle>
      <div className="mt-8 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard value="~$15K" label="Monthly Recurring Revenue" accent="emerald" />
        <StatCard value="50/50" label="Self-Funded, Founders Only" accent="blue" />
        <StatCard value="Active" label="Enterprise at $9-20K+/mo" accent="purple" />
        <StatCard value="$1M" label="Neel Dhingra Webinar" accent="amber" />
      </div>
      <div className="border-white/8 mt-6 max-w-lg rounded-xl border bg-white/[0.03] p-4 text-center">
        <p className="text-sm text-white/50">
          <span className="font-semibold text-white/80">Case Study:</span> Neel Dhingra — campaign
          built on a plane in Vibey. 6,000 registrations. $1M webinar.
        </p>
      </div>
      <p className="mt-6 max-w-lg text-center text-sm text-white/40">
        Could continue bootstrapping with enterprise deals.{' '}
        <span className="font-semibold text-white/60">
          But we&apos;re here to make Vibey the next AI unicorn.
        </span>
      </p>
    </Slide>
  )
}
