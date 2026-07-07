import { Slide, SlideLabel, SlideSub, SlideTitle } from './slide-primitives'

export function SlideCompetition() {
  const rows = [
    {
      competitor: 'Open Source (CrewAI, LangGraph)',
      them: 'Powerful frameworks needing dev teams to deploy',
      vibey: 'Vibey is the finished car — you get in and drive',
    },
    {
      competitor: 'Claude / ChatGPT',
      them: "Single agent on your laptop. Can't deploy to your domain.",
      vibey: 'Team of specialists. Deploys funnels, ads, emails — production.',
    },
    {
      competitor: 'Manus',
      them: 'One prompt, one result',
      vibey: 'Breaks missions into subtasks, assigns specialists, manages dependencies',
    },
    {
      competitor: 'Viktor',
      them: 'AI coworker in Slack with 3K+ tools',
      vibey: "Doesn't build funnels, deploy pages, send sequences, or manage campaigns",
    },
    {
      competitor: 'Mesha / Flint / groas',
      them: 'Specialized tools (ads, landing pages)',
      vibey: 'Each does ONE piece. None does the complete loop to autonomous management.',
    },
  ]
  return (
    <Slide>
      <SlideLabel>Positioning</SlideLabel>
      <SlideTitle>COMPETITIVE LANDSCAPE</SlideTitle>
      <SlideSub>
        No competitor combines a multi-agent workforce + marketing OS + production-grade deployment.
      </SlideSub>
      <div className="border-white/8 mt-6 w-full max-w-4xl overflow-hidden rounded-xl border">
        <div className="border-white/8 grid grid-cols-3 border-b bg-white/[0.04]">
          <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
            Competitor
          </div>
          <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
            Their Approach
          </div>
          <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Vibey Edge
          </div>
        </div>
        {rows.map((r) => (
          <div
            key={r.competitor}
            className="grid grid-cols-3 border-b border-white/5 last:border-0"
          >
            <div className="px-4 py-2.5 text-[11px] font-medium text-white/70">{r.competitor}</div>
            <div className="px-4 py-2.5 text-[10px] text-white/40">{r.them}</div>
            <div className="px-4 py-2.5 text-[10px] font-medium text-emerald-400/80">{r.vibey}</div>
          </div>
        ))}
      </div>
    </Slide>
  )
}
