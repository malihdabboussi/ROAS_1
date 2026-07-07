import { Sparkles } from 'lucide-react'
import { Slide, SlideLabel, SlideTitle } from './slide-primitives'

export function SlidePreloadedAndHire() {
  const departments = [
    'C-Suite',
    'Marketing',
    'Graphic Design',
    'Development',
    'Operations',
    'Finance',
    'Customer Support',
    'Media Production',
    'Knowledge Mgmt',
    'HR / Recruiting',
    'Social Media',
    'Analytics',
  ]
  return (
    <Slide>
      <SlideLabel>Your Team</SlideLabel>
      <SlideTitle>PRE-LOADED &amp; HIREABLE</SlideTitle>
      <div className="mt-8 grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-400">
            20+ Agents Ready Day One
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {departments.map((d) => (
              <div
                key={d}
                className="border-white/8 rounded-lg border bg-white/[0.03] px-2 py-1.5 text-center text-[11px] text-white/50"
              >
                {d}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-6">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-400">
            + Hire Your Own
          </h4>
          <p className="text-sm text-white/60">
            Describe the role. Define the skills. Set the personality. HR builds a custom agent with
            its own brain, skills, and authority — tailored to your business.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
            <Sparkles size={14} /> Just describe it. HR builds it.
          </div>
        </div>
      </div>
    </Slide>
  )
}
