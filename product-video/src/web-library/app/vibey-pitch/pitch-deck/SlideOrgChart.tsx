import { agentByKey, vibeyPortrait } from './agent-data'
import { OrgNode, Slide, SlideLabel, SlideTitle } from './slide-primitives'

export function SlideOrgChart() {
  const orgRoles = [
    { name: 'Vibey', role: 'CEO', src: vibeyPortrait, highlight: true },
    { name: 'Mara', role: 'Marketing Ops', src: agentByKey('pm_marketing') },
    { name: 'Kai', role: 'Product Lead', src: agentByKey('pm_product') },
    { name: 'Jett', role: 'Operations', src: agentByKey('pm_operations') },
    { name: 'Ivy', role: 'Copywriter', src: agentByKey('copywriter') },
    { name: 'Lux', role: 'Designer', src: agentByKey('designer') },
    { name: 'Niko', role: 'Analyst', src: agentByKey('analyst') },
    { name: 'Rex', role: 'Developer', src: agentByKey('developer') },
    { name: 'Zane', role: 'Automation', src: agentByKey('automation_integrations_engineer') },
  ]
  return (
    <Slide>
      <SlideLabel>Organizational HR</SlideLabel>
      <SlideTitle>EVERY ORG HAS ITS OWN HR</SlideTitle>
      <div className="mt-8 flex w-full max-w-4xl flex-col items-center gap-5">
        <OrgNode {...orgRoles[0]!} />
        <div className="h-5 w-px bg-white/10" />
        <div className="grid grid-cols-3 gap-4">
          {orgRoles.slice(1, 4).map((r) => (
            <OrgNode key={r.name} {...r} />
          ))}
        </div>
        <div className="h-3 w-px bg-white/10" />
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
          {orgRoles.slice(4).map((r) => (
            <OrgNode key={r.name} {...r} />
          ))}
        </div>
      </div>
      <div className="mt-6 grid w-full max-w-3xl gap-3 md:grid-cols-3">
        <div className="border-white/8 rounded-lg border bg-white/[0.03] p-3 text-center">
          <div className="text-xs font-semibold text-emerald-400">Recommended Hires</div>
          <div className="mt-1 text-[11px] text-white/40">
            HR analyzes gaps and recommends specialists
          </div>
        </div>
        <div className="border-white/8 rounded-lg border bg-white/[0.03] p-3 text-center">
          <div className="text-xs font-semibold text-blue-400">Performance Insights</div>
          <div className="mt-1 text-[11px] text-white/40">
            Every agent scored on quality after missions
          </div>
        </div>
        <div className="border-white/8 rounded-lg border bg-white/[0.03] p-3 text-center">
          <div className="text-xs font-semibold text-amber-400">Team Management</div>
          <div className="mt-1 text-[11px] text-white/40">
            Evaluate, train, adjust roles, set expectations
          </div>
        </div>
      </div>
    </Slide>
  )
}
