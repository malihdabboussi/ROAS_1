import { Slide, SlideLabel, SlideTitle } from './slide-primitives'

export function SlideFounders() {
  return (
    <Slide>
      <SlideLabel>The Founders</SlideLabel>
      <SlideTitle>PROVEN TRACK RECORD</SlideTitle>
      <div className="mt-10 grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <div className="border-white/8 rounded-2xl border bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-lg font-bold text-emerald-400">
              DV
            </div>
            <div>
              <div className="text-lg font-bold text-white">Dylan Vanas</div>
              <div className="text-sm text-white/40">CEO / Co-Founder</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-white/60">
            <li>Decade of performance marketing</li>
            <li>Built &amp; exited 2 companies (incl. DopeTech.com)</li>
            <li>Runs ROAS.co — now operating through Vibey</li>
            <li>Closes six-figure deals; demos product himself</li>
          </ul>
        </div>
        <div className="border-white/8 rounded-2xl border bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-blue-500/10 text-lg font-bold text-blue-400">
              ST
            </div>
            <div>
              <div className="text-lg font-bold text-white">Sefy Tofan</div>
              <div className="text-sm text-white/40">CTO / Co-Founder</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-white/60">
            <li>Built 82-person marketing agency from $5 Fiverr gigs</li>
            <li>Replaced 82 employees with 17 AI agents ($550/mo)</li>
            <li>Self-taught engineer; built entire platform solo</li>
            <li>Manages enterprise clients + monitors logs in real-time</li>
          </ul>
        </div>
      </div>
    </Slide>
  )
}
