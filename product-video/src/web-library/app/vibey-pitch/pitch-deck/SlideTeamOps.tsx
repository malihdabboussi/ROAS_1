import { Slide, SlideLabel, SlideTitle } from './slide-primitives'

export function SlideTeamOps() {
  return (
    <Slide>
      <SlideLabel>Team</SlideLabel>
      <SlideTitle>COMMANDO TEAMS</SlideTitle>
      <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-3">
        {[
          { dept: 'Management', detail: 'Founders team', cost: '$8K/m ×2' },
          { dept: 'Development', detail: '3 engineers', cost: '$10K/dev' },
          { dept: 'Marketing & Sales', detail: 'Partnerships', cost: 'Included' },
          { dept: 'Support', detail: 'QA / DevOps / Design', cost: '$30K/m' },
          { dept: 'Coaches & Enterprise', detail: 'Relationships', cost: 'Revenue share' },
          { dept: 'R&D', detail: 'Hardware, compute, data', cost: 'Post-raise' },
        ].map((t) => (
          <div key={t.dept} className="border-white/8 rounded-xl border bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white">{t.dept}</div>
            <div className="mt-1 text-xs text-white/40">{t.detail}</div>
            <div className="mt-2 text-xs font-medium text-white/25">{t.cost}</div>
          </div>
        ))}
      </div>
    </Slide>
  )
}
