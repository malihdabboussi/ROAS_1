import { Brain, Cloud, Plug, Wrench } from 'lucide-react'
import { vibeyPortrait } from './agent-data'
import { AgentAvatar, PillarBadge, Slide, SlideLabel } from './slide-primitives'

export function SlideSoloAgent() {
  return (
    <Slide>
      <SlideLabel>The Solution</SlideLabel>
      <h2 className="max-w-4xl text-center font-[family-name:var(--font-site-headline)] text-2xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
        MEET THE MOST POWERFUL AI AGENT
        <br />
        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          EVER BUILT FOR BUSINESS
        </span>
      </h2>
      <div className="mt-10 flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-emerald-500/10 blur-xl" />
            <AgentAvatar
              src={vibeyPortrait}
              name="Vibey"
              size={96}
              className="relative ring-2 ring-emerald-500/30"
            />
          </div>
          <div className="grid w-full max-w-md gap-3 md:grid-cols-2">
            <PillarBadge
              icon={Brain}
              label="Brain"
              description="3 layers of compounding memory. Gets smarter every interaction."
              accent="#34d399"
            />
            <PillarBadge
              icon={Cloud}
              label="Cloud Computer"
              description="Dedicated machine 24/7. Works while you sleep."
              accent="#60a5fa"
            />
            <PillarBadge
              icon={Wrench}
              label="Skills"
              description="100+ premade. Upload SOPs — it masters them permanently."
              accent="#c084fc"
            />
            <PillarBadge
              icon={Plug}
              label="Integrations"
              description="36+ live OAuth connections executing real actions."
              accent="#fb923c"
            />
          </div>
        </div>
        <div className="border-white/8 flex-1 rounded-2xl border bg-white/[0.03] p-5">
          <p className="text-sm leading-relaxed text-white/50">
            This single agent can research your market, build your landing page, write your email
            sequence, publish your ads, capture your leads, and manage the entire operation{' '}
            <span className="font-semibold text-white/80">autonomously</span>.
          </p>
        </div>
      </div>
    </Slide>
  )
}
